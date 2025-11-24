# Hugging Face Space Worker Setup Guide

This is the canonical runbook for deploying or rebuilding the transcription worker on Hugging Face Spaces. It reflects everything we learned while fixing DNS resolution, YouTube bot detection, and build failures in November 2025.

## Quick Facts

- **Space:** `analyticsbyted/tubetime-transcription-worker`
- **SDK:** Docker (Gradio/Blank were tested but reverted)
- **Port:** 7860 (Spaces injects `PORT`, but the startup script defaults to 7860)
- **Key Files:** `huggingface-space/Dockerfile`, `app.py`, `requirements.txt`, `packages.txt` (for future SDK switch)
- **Secrets:** `TRANSCRIPTION_WORKER_SECRET` (auth) + `YOUTUBE_COOKIES` (Base64 Netscape cookie file)
- **Test Harness:** `node test_worker_connection.cjs`

## Prerequisites

- Hugging Face account (https://huggingface.co/join)
- Access to a YouTube account for fresh cookies (export via browser dev tools)
- Local `.env` file with worker URL + secret
- `openssl`, `python3`, and `base64` CLI available for secret prep

## Step-by-Step Setup

### Step 1: Prep YouTube Cookies (Required for Bypassing Bot Checks)

1. Export cookies from a logged-in browser session using the “Copy cookies as Netscape” feature (e.g., via the EditThisCookie extension or `Developer Tools → Application → Cookies → Export`).
2. Run the filter script to drop expired entries:
   ```bash
   python3 filter_active_cookies.py cookies-raw.txt youtube-cookie-active.txt
   ```
3. Base64 encode the filtered file to preserve tabs/newlines:
   ```bash
   base64 youtube-cookie-active.txt > youtube-cookie-active.b64
   ```
4. You’ll paste the entire one-line Base64 string into the Hugging Face secret `YOUTUBE_COOKIES`. Tabs are critical for yt-dlp; never paste the raw text directly.

> **Rotation Tip:** Cookies expire every few days. Re-run the steps above and update the secret whenever YouTube starts returning “Sign in to confirm you’re not a bot.”

### Step 2: Create or Rebuild the Space

1. Go to https://huggingface.co/spaces and click **Create new Space**.
2. Form values:
   - **Owner:** Your username or organization
   - **Space name:** `tubetime-transcription-worker` (or consistent variant)
   - **SDK:** **Docker**
   - **Visibility:** Private (recommended)
   - **Hardware:** CPU basic (free tier works, but expect ~1x real-time transcription)
3. Click **Create Space**.

### Step 3: Upload the Worker Code

Either drag/drop via the UI or push via git. Files to include:

- `Dockerfile` – runs as root, installs `ffmpeg`, `git`, `dnsutils`, and writes `/start.sh` that re-applies DNS servers (`8.8.8.8`, `8.8.4.4`, `1.1.1.1`) before launching `uvicorn`. **Do not reintroduce non-root users**; Hugging Face overwrites `/etc/resolv.conf` otherwise.
- `app.py` – FastAPI app with `/` health and `/transcribe` endpoints. Handles Base64 cookies and raises HTTP 400 for videos > 15 minutes.
- `requirements.txt`
- `packages.txt` – currently only `ffmpeg`. Used if we ever switch back to Gradio SDK.

If you prefer git:

```bash
cd huggingface-space
git init
git remote add origin https://huggingface.co/spaces/<owner>/<space>
git add Dockerfile app.py requirements.txt packages.txt
git commit -m "Deploy worker"
git push origin main
```

### Step 4: Configure Secrets

Go to **Settings → Variables and secrets** inside the Space and add:

| Key | Value | Notes |
|-----|-------|-------|
| `TRANSCRIPTION_WORKER_SECRET` | Output of `openssl rand -base64 32` | Must match `TRANSCRIPTION_WORKER_SECRET` in `.env`. |
| `YOUTUBE_COOKIES` | Contents of `youtube-cookie-active.b64` | Single line string; the app decodes it server-side and verifies tabs. |

Optional (used for debugging):

| Key | Purpose |
|-----|---------|
| `WHISPER_MODEL_ID` | Override the default `distil-whisper/distil-medium.en`. |
| `PYTHONUNBUFFERED` | Already set in Dockerfile (`1`). |

### Step 5: Update Local Environment

Edit `.env` in the repo root:

```env
TRANSCRIPTION_WORKER_URL="https://<owner>-tubetime-transcription-worker.hf.space"
TRANSCRIPTION_WORKER_SECRET="same-value-as-in-space"
```

Restart any running dev servers after editing `.env`.

### Step 6: Monitor the Build

1. Switch to the **Logs** tab right after pushing.
2. Confirm the following sequence:
   - Docker pulls `python:3.11`
   - `apt-get` installs `ffmpeg git dnsutils`
   - `pip install -r requirements.txt`
   - Whisper model downloads the first time the app handles `/transcribe`
3. Wait for `INFO: Application startup complete.`  
   If you see `Exit code: 0` immediately, it means the startup script didn’t run (usually because `/start.sh` wasn’t executable). Re-push to rebuild.

### Step 7: Run Smoke Tests

1. **Health check**
   ```bash
   curl https://<owner>-tubetime-transcription-worker.hf.space/
   ```
   Should include `{"status":"ok","cookies":{"status":"set",...}}`.

2. **Connection script** (runs both health + transcription)
   ```bash
   node test_worker_connection.cjs
   ```
   The script uses `.env` credentials and reports latency + payload.

3. **Manual transcription**
   ```bash
   curl -X POST https://<owner>-tubetime-transcription-worker.hf.space/transcribe \
     -H "Authorization: Bearer $TRANSCRIPTION_WORKER_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"videoId":"tPEE9ZwTmy0","language":"en"}'
   ```

4. **App-level test**
   - Queue a fresh video inside TubeTime.
   - Watch `/api/transcription-queue/process` logs.
   - Verify `TranscriptionProgress` -> “View transcript” flows with no blank modal.

### Step 8: Document Secrets for Future Rotations

- Store the latest cookie export date + browser in a secure doc (not in git).
- Note who last rotated the cookies and when the Space was rebuilt.
- Update this doc if you change the Dockerfile or add new secrets.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `socket.gaierror: [Errno -5]` | `/etc/resolv.conf` overwritten after reboot | Ensure Dockerfile + `/start.sh` still echo Google/Cloudflare DNS right before `uvicorn`. Never run as non-root. |
| `Sign in to confirm you’re not a bot` | Cookies missing or stale | Re-export cookies, run `filter_active_cookies.py`, Base64 encode, update `YOUTUBE_COOKIES`. |
| Build fails with exit code 255 | Secrets too large or invalid | Ensure `YOUTUBE_COOKIES` line is <10 KB and contains no newline characters outside Base64. |
| `Address already in use` on port 7861 | Gradio SDK auto-launch + manual `uvicorn` conflict | Only relevant if switching SDKs. Our Dockerfile launches `uvicorn` directly so this should not happen. |
| Transcript modal blank | `Video` relation missing | Ensure you’re on commit `Ensure Video record exists before creating transcript` (Nov 23). |
| Transcript too short vs video length | yt-dlp served SABR images only | Worker logs a warning with expected vs actual word count. Re-queue with fresh cookies or wait for manual review. |

More detailed postmortems for each incident live in `docs/TRANSCRIPTION_WORKER_TROUBLESHOOTING.md`.

## Updating the Worker

1. Make changes under `huggingface-space/`.
2. Commit + push to both GitHub (for history) and the Space remote.
3. Watch the Space rebuild. Factory rebuilds wipe the Docker cache, so the first transcription after re-push will download the Whisper weights again (~800 MB).

## Alternative Platforms

If Hugging Face resumes blocking DNS, the worker can be redeployed to:

- **Railway:** Dockerfile-ready, also supports cron tasks for queue polling.
- **Render:** Free web service plan can run FastAPI with similar resources.
- **Fly.io:** Good for global routing; would require secrets stored via `fly secrets`.

See `docs/TRANSCRIPTION_WORKER_TROUBLESHOOTING.md` for pros/cons captured during earlier evaluations.

## Security Notes

- Keep the Space private. Public Spaces expose `/transcribe` to anyone who guesses the URL.
- Never commit secrets or raw cookie files.
- Remove old cookies from local machines once encoded.
- Rotate `TRANSCRIPTION_WORKER_SECRET` if it’s ever exposed; update `.env` simultaneously.

## Support Checklist

1. Check Space logs (build + runtime).
2. Run `node test_worker_connection.cjs`.
3. Review worker logs in Hugging Face (look for yt-dlp warnings).
4. Verify Prisma tables (`npx prisma studio`) if UI still fails.
5. Escalate to alternative platform plan if DNS fails repeatedly even after rebuild.

