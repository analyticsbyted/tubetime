# Hugging Face Space: TubeTime Transcription Worker

FastAPI-based worker that runs on a free Hugging Face Space. It exposes a `/transcribe` endpoint that downloads a YouTube video’s audio, runs Whisper (`distil-whisper/distil-medium.en`), and returns transcript metadata to the TubeTime Next.js app.

## Repo Structure

```
huggingface-space/
├── README.md           # This file
├── app.py              # FastAPI entrypoint (Spaces default)
├── requirements.txt    # Python dependencies installed by Spaces
└── runtime.txt         # (Optional) Pin Python version if needed
```

## Secrets & Environment Variables

| Name | Required | Description |
| ---- | -------- | ----------- |
| `TRANSCRIPTION_WORKER_SECRET` | ✅ | Shared Bearer token used by the Next.js app. Store it as a “Space secret” (`Settings → Variables and Secrets`). |
| `WHISPER_MODEL_ID` | ❌ | Override the default `distil-whisper/distil-medium.en` model. Useful if we test smaller/faster variants. |

> **Note:** On the Next.js side we call this worker via the `TRANSCRIPTION_WORKER_URL`; both values live in `.env.local`.

## Deployment Steps

1. **Create a new Space**
   - Visit <https://huggingface.co/spaces> → `Create new Space`
   - Template: **FastAPI**, Visibility: **Private** (or Team-only)
2. **Upload contents**
   - Drag the files in `huggingface-space/` into the new repo (or connect via git).
3. **Add secrets**
   - `Settings → Variables and secrets → Add new secret`
   - Key: `TRANSCRIPTION_WORKER_SECRET`, Value: shared secret from our `.env`
   - Optional: `WHISPER_MODEL_ID`
4. **Deploy**
   - Spaces will install from `requirements.txt`, run `app.py`, and expose a public URL.
5. **Sanity test**
   - `POST /transcribe` with a sample video ID using curl or the built-in “Use via API” panel.

## API Contract

### Health
```
GET /
→ 200 OK: { "status": "ok", "model": "...", "device": "cpu" }
```

### Transcribe
```
POST /transcribe
Authorization: Bearer <TRANSCRIPTION_WORKER_SECRET>
Content-Type: application/json

{
  "videoId": "dQw4w9WgXcQ",
  "language": "en"      // optional hint
}
```

**Response**
```
{
  "videoId": "dQw4w9WgXcQ",
  "text": "...",
  "segments": [ { "text": "...", "timestamp": [0.0, 4.2] }, ... ],
  "language": "en",
  "confidence": -0.12,
  "duration": 183,
  "wordCount": 512,
  "processingDuration": 37.4
}
```

Errors follow FastAPI conventions (`{"detail": "Unauthorized"}`, etc.).

## Local Testing

```bash
cd huggingface-space
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export TRANSCRIPTION_WORKER_SECRET="dev-secret"
uvicorn app:app --reload --port 7860
```

Then POST to `http://localhost:7860/transcribe` using curl or REST client.

## Notes

- The worker downloads audio to a temp directory and cleans up automatically.
- `yt_dlp` + `ffmpeg` are used to extract and normalize audio into 16k mono WAV (required by Whisper).
- Whisper runs on CPU by default; if a GPU becomes available, the pipeline will automatically use it.
- Keep logs minimal—Spaces storage is limited. The worker logs one line per request summarizing video ID and processing time.


