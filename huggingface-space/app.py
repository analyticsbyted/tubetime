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

# Lazy-load the transcription pipeline to avoid blocking container startup
# Model download happens on first transcription request, not at startup
_asr_pipeline = None

def get_asr_pipeline():
  global _asr_pipeline
  if _asr_pipeline is None:
    logger.info("Initializing ASR pipeline (downloading model if needed)...")
    _asr_pipeline = pipeline(
      "automatic-speech-recognition",
      model=DEFAULT_MODEL_ID,
      chunk_length_s=30,
      device=0 if os.getenv("CUDA_VISIBLE_DEVICES") else -1,
    )
    logger.info("ASR pipeline initialized")
  return _asr_pipeline

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
    # Try audio-only first, then fallback to any format (we'll extract audio)
    "format": "bestaudio/best",
    "outtmpl": output_path,
    "quiet": False,
    "verbose": True,
    "force_ipv4": True,
    "nopart": True,
    # Don't restrict player_client - let yt-dlp choose the best one
    # Cookies will still be used if available
    "postprocessors": [
      {
        "key": "FFmpegExtractAudio",
        "preferredcodec": "wav",
        "preferredquality": "192",
      }
    ],
  }

  # Add cookies if provided via environment variable
  # This helps bypass YouTube's bot detection
  # Note: Handle secret defensively to avoid any build-time issues
  # Cookies can be provided as plain text (Netscape format) or base64-encoded
  youtube_cookies = None
  try:
    youtube_cookies_raw = os.getenv("YOUTUBE_COOKIES")
    if youtube_cookies_raw:
      logger.info("YOUTUBE_COOKIES secret found (length: %d chars)", len(youtube_cookies_raw))
      # Try to decode as base64 first (preserves tabs exactly)
      # If that fails, use as plain text
      try:
        import base64
        youtube_cookies = base64.b64decode(youtube_cookies_raw).decode('utf-8')
        logger.info("✅ Decoded cookies from base64 (preserves tabs exactly)")
      except Exception:
        # Not base64, use as plain text
        youtube_cookies = youtube_cookies_raw
        logger.info("Using cookies as plain text (may have lost tabs)")
    else:
      logger.warning("YOUTUBE_COOKIES secret is not set or empty")
  except Exception as e:
    logger.warning("Failed to read YOUTUBE_COOKIES secret: %s", str(e))
  
  cookie_file = None
  if youtube_cookies and youtube_cookies.strip():
    try:
      # Write cookies to a temporary file
      cookie_file = os.path.join(tmpdir, "cookies.txt")
      
      # Check if tabs are preserved (Netscape format requires tabs)
      # If tabs are missing, try to restore them by converting spaces to tabs
      # where appropriate (between cookie fields)
      cookie_content = youtube_cookies
      
      # Detect if tabs are missing: Netscape format should have tabs between fields
      # A valid cookie line should have multiple tab-separated fields
      sample_lines = cookie_content.split('\n')[:10]  # Check first 10 lines
      has_tabs = False
      tab_count_sample = 0
      for line in sample_lines:
        if line.strip() and not line.strip().startswith('#'):
          tab_count = line.count('\t')
          if tab_count > 0:
            has_tabs = True
            tab_count_sample = tab_count
            logger.info("Found cookie line with %d tabs", tab_count)
            break
      
      if not has_tabs:
        logger.warning("⚠️ NO TABS DETECTED in cookies - attempting to restore format")
        logger.warning("This suggests tabs were converted to spaces when pasting into Hugging Face secret")
        # Try to restore tabs: Netscape format is: domain, flag, path, secure, expiry, name, value
        # The format is: domain<TAB>flag<TAB>path<TAB>secure<TAB>expiry<TAB>name<TAB>value
        restored_lines = []
        restored_count = 0
        for line in cookie_content.split('\n'):
          if line.strip() and not line.strip().startswith('#'):
            # Try to restore tabs: split by whitespace and rejoin with tabs
            # Netscape format has 7 fields: domain, flag, path, secure, expiry, name, value
            parts = line.split()
            if len(parts) >= 7:
              # Reconstruct with tabs: first 6 fields, then name and value (value may contain spaces)
              restored_line = '\t'.join(parts[:5]) + '\t' + parts[5] + '\t' + ' '.join(parts[6:])
              restored_lines.append(restored_line)
              restored_count += 1
            elif len(parts) >= 6:
              # Some cookies might have 6 fields
              restored_line = '\t'.join(parts[:5]) + '\t' + parts[5]
              restored_lines.append(restored_line)
              restored_count += 1
            else:
              restored_lines.append(line)
          else:
            restored_lines.append(line)
        cookie_content = '\n'.join(restored_lines)
        logger.info("✅ Restored tab-separated format for %d cookie lines", restored_count)
      else:
        logger.info("✅ Tabs detected in cookies (sample line has %d tabs)", tab_count_sample)
      
      with open(cookie_file, "w", encoding="utf-8") as f:
        f.write(cookie_content)
      ydl_opts["cookiefile"] = cookie_file
      logger.info("Using YouTube cookies for authentication (cookie file: %s)", cookie_file)
      # Log first few lines of cookie file for debugging (without sensitive values)
      with open(cookie_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
        logger.info("Cookie file contains %d lines", len(lines))
        if lines:
          first_line = lines[0] if lines[0].strip() else (lines[1] if len(lines) > 1 else "")
          if first_line:
            # Count tabs in first cookie line
            tab_count = first_line.count('\t')
            logger.info("First cookie line has %d tabs (expected: 6+)", tab_count)
            logger.info("First cookie line (sanitized): %s", first_line[:80] + "..." if len(first_line) > 80 else first_line)
    except Exception as e:
      logger.error("Failed to write cookies file: %s", str(e), exc_info=True)

  # yt-dlp works better with full URL, but can also accept just video ID
  # Try full URL first for better reliability
  youtube_url = f"https://www.youtube.com/watch?v={video_id}"
  
  with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
      info = ydl.extract_info(youtube_url, download=True)
    except Exception as e:
      # Fallback: try with just video ID if URL format fails
      logger.warning("Failed with URL format, trying video ID directly: %s", str(e))
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
  pipeline = get_asr_pipeline()
  
  # Check if model is English-only (ends with .en)
  model_id = os.getenv("WHISPER_MODEL_ID", DEFAULT_MODEL_ID)
  is_english_only = model_id.endswith('.en')
  
  # For English-only models, don't pass language or task parameters
  # Don't include generate_kwargs at all for English-only models
  if is_english_only:
    result = pipeline(
      wav_path,
      return_timestamps=True,
    )
  else:
    # For multilingual models, allow language specification
    generate_kwargs = {"task": "transcribe"}
    if language:
      generate_kwargs["language"] = language
    
    result = pipeline(
      wav_path,
      generate_kwargs=generate_kwargs,
      return_timestamps=True,
    )
  
  return result


@app.get("/")
async def health():
  # Check if cookies are available (without exposing them)
  youtube_cookies = os.getenv("YOUTUBE_COOKIES")
  cookie_status = "not_set"
  cookie_length = 0
  cookie_line_count = 0
  
  if youtube_cookies:
    cookie_status = "set"
    cookie_length = len(youtube_cookies)
    cookie_line_count = len(youtube_cookies.split('\n'))
  else:
    cookie_status = "not_set"
  
  return {
    "status": "ok",
    "model": DEFAULT_MODEL_ID,
    "device": "cuda" if os.getenv("CUDA_VISIBLE_DEVICES") else "cpu",
    "cookies": {
      "status": cookie_status,
      "length": cookie_length,
      "line_count": cookie_line_count,
    }
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
    # Clean up temporary files (audio files and cookie file)
    if wav_path and os.path.exists(os.path.dirname(wav_path)):
      try:
        for filename in os.listdir(os.path.dirname(wav_path)):
          file_path = os.path.join(os.path.dirname(wav_path), filename)
          os.remove(file_path)
        os.rmdir(os.path.dirname(wav_path))
      except OSError:
        pass


# Pure FastAPI app - Docker SDK handles server startup via Dockerfile CMD
# DNS configuration is handled in the Dockerfile

