import logging
import os
import tempfile
import time
from typing import Optional

import soundfile as sf
import yt_dlp
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from transformers import pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tubetime_worker")

DEFAULT_MODEL_ID = os.getenv("WHISPER_MODEL_ID", "distil-whisper/distil-medium.en")
SHARED_SECRET = os.getenv("TRANSCRIPTION_WORKER_SECRET")
MAX_DURATION_SECONDS = 15 * 60

if not SHARED_SECRET:
  raise RuntimeError("TRANSCRIPTION_WORKER_SECRET is not set.")

# Lazy-load the transcription pipeline
asr_pipeline = pipeline(
  "automatic-speech-recognition",
  model=DEFAULT_MODEL_ID,
  chunk_length_s=30,
  device=0 if os.getenv("CUDA_VISIBLE_DEVICES") else -1,
)

app = FastAPI(title="TubeTime Transcription Worker")


class TranscriptionRequest(BaseModel):
  videoId: str = Field(..., description="YouTube video ID")
  language: Optional[str] = Field(
    default=None, description="Language hint (ISO code)"
  )


def _validate_bearer_token(authorization: Optional[str]) -> None:
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code=401, detail="Unauthorized")

  token = authorization.split(" ", 1)[1].strip()
  if token != SHARED_SECRET:
    raise HTTPException(status_code=401, detail="Unauthorized")


def _download_audio(video_id: str) -> tuple[str, float]:
  """
  Downloads audio using yt_dlp and returns the WAV path plus duration seconds.
  """
  tmpdir = tempfile.mkdtemp(prefix="tubetime_")
  output_path = os.path.join(tmpdir, f"{video_id}.%(ext)s")

  ydl_opts = {
    "format": "bestaudio/best",
    "outtmpl": output_path,
    "quiet": True,
    "nopart": True,
    "postprocessors": [
      {
        "key": "FFmpegExtractAudio",
        "preferredcodec": "wav",
        "preferredquality": "192",
      }
    ],
  }

  with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(video_id, download=True)

  wav_path = output_path.replace(".%(ext)s", ".wav")
  if not os.path.exists(wav_path):
    raise RuntimeError("Failed to produce WAV audio.")

  duration = info.get("duration") or _probe_duration(wav_path)

  if duration and duration > MAX_DURATION_SECONDS:
    raise HTTPException(
      status_code=400,
      detail=f"Video exceeds 15-minute limit ({duration:.0f}s).",
    )

  return wav_path, duration


def _probe_duration(path: str) -> float:
  data, samplerate = sf.read(path)
  frames = data.shape[0]
  return frames / float(samplerate)


def _transcribe_audio(wav_path: str, language: Optional[str]) -> dict:
  result = asr_pipeline(
    wav_path,
    generate_kwargs={
      "language": language,
      "task": "transcribe",
    }
    if language
    else None,
    return_timestamps=True,
  )
  return result


@app.get("/")
async def health():
  return {
    "status": "ok",
    "model": DEFAULT_MODEL_ID,
    "device": "cuda" if os.getenv("CUDA_VISIBLE_DEVICES") else "cpu",
  }


@app.post("/transcribe")
async def transcribe(
  payload: TranscriptionRequest, authorization: Optional[str] = Header(default=None)
):
  _validate_bearer_token(authorization)

  started = time.perf_counter()
  wav_path = None

  try:
    logger.info("Starting transcription for %s", payload.videoId)
    wav_path, duration = _download_audio(payload.videoId)
    logger.info(
      "Audio downloaded for %s (%.2fs)", payload.videoId, duration or 0
    )
    asr_result = _transcribe_audio(wav_path, payload.language)

    text = asr_result.get("text", "").strip()
    segments = asr_result.get("chunks") or []
    inferred_lang = asr_result.get("language") or payload.language
    confidence = asr_result.get("avg_log_prob")

    processing_duration = time.perf_counter() - started

    logger.info(
      "Transcription completed for %s in %.2fs",
      payload.videoId,
      processing_duration,
    )

    return {
      "videoId": payload.videoId,
      "text": text,
      "segments": segments,
      "language": inferred_lang,
      "confidence": confidence,
      "duration": duration,
      "wordCount": len(text.split()),
      "processingDuration": processing_duration,
    }
  except yt_dlp.utils.DownloadError as err:
    logger.warning("Download failed for %s: %s", payload.videoId, err)
    raise HTTPException(status_code=404, detail=str(err)) from err
  except HTTPException as err:
    logger.warning(
      "Rejected transcription for %s: %s", payload.videoId, err.detail
    )
    raise
  except Exception as err:
    logger.exception("Unexpected error for %s", payload.videoId)
    raise HTTPException(status_code=500, detail=str(err)) from err
  finally:
    if wav_path and os.path.exists(os.path.dirname(wav_path)):
      try:
        for filename in os.listdir(os.path.dirname(wav_path)):
          os.remove(os.path.join(os.path.dirname(wav_path), filename))
        os.rmdir(os.path.dirname(wav_path))
      except OSError:
        pass

