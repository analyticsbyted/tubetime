# Transcription Worker Troubleshooting Report

**Last Updated:** November 24, 2025  
**Environment:** Hugging Face Spaces (`analyticsbyted/tubetime-transcription-worker`)  
**Status:** ✅ **Operational with caveats (cookie rotation + SABR challenges)**  

This document captures every incident, attempted fix, and remaining risk related to the transcription worker so future developers can quickly understand what happened and why the current configuration looks the way it does.

## Architecture Overview (2025)

```
Next.js App (app/page.jsx) ──┐
                             │ queue + poll
app/api/transcription-queue/process ── calls ──> transcriptionService.transcribeVideo()
                             │
                             ▼
Hugging Face Space Worker (FastAPI + Whisper + yt-dlp)
                             │
                             ▼
Prisma (Transcript + Video tables) → TranscriptModal / Transcripts page
```

- **Worker URL:** `https://analyticsbyted-tubetime-transcription-worker.hf.space`
- **Dockerfile:** `python:3.11` base, runs as root, rewrites `/etc/resolv.conf` during build **and** at runtime.
- **Secrets:** `TRANSCRIPTION_WORKER_SECRET`, `YOUTUBE_COOKIES` (Base64 Netscape file).
- **Model:** `distil-whisper/distil-medium.en` (English only, GPU optional but currently CPU).
- **Testing:** `node test_worker_connection.cjs` exercises health + `/transcribe`.

## Incident Timeline & Resolutions

| Date | Issue | Symptoms | Resolution | Status |
|------|-------|----------|------------|--------|
| Nov 18 | DNS failures inside Space | `[Errno -5] No address associated with hostname` from yt-dlp | Switched to `python:3.11`, removed non-root user, injected Google + Cloudflare DNS in Dockerfile and `/start.sh`. | ✅ |
| Nov 19 | YouTube bot wall (“Sign in to confirm you’re not a bot”) | yt-dlp only saw image formats | Added cookie ingestion pipeline (filter → Base64 secret → temp file) and iOS UA fallback. | ✅ |
| Nov 20 | Build failed when cookie secret added | Hugging Face build exited 255 | Filtered cookies (script), Base64 encoded to reduce size to ~3 KB. | ✅ |
| Nov 21 | Gradio SDK experiment | Port 7860 conflict, process exited immediately | Documented approach but reverted to Docker SDK for predictable startup. | ✅ (reverted) |
| Nov 22 | Transcript modal blank | Transcript saved without `video` relation | `app/api/transcription-queue/process/route.js` now `upsert`s `Video` before creating `Transcript`; UI has fallbacks. | ✅ |
| Nov 23 | Partial transcript (~600 chars of 4-min video) | Worker saw SABR formats only; `yt-dlp` warning “Requested format not available” | Added runtime telemetry to log expected vs actual words and surface warnings. Issue persists when YouTube enforces SABR; manual retry or new cookies required. | ⚠️ |

### Detailed Notes per Incident

1. **DNS Fix (Critical)**
   - The non-root user introduced earlier couldn’t rewrite `/etc/resolv.conf`, so Spaces reverted to its internal resolver and DNS broke.
   - Fix is codified in `huggingface-space/Dockerfile` and `/start.sh`. Do not reintroduce `USER` instructions.

2. **Cookie Workflow**
   - `filter_active_cookies.py` removes expired rows to keep secrets <10 KB.
   - Always Base64 encode the filtered file before storing in `YOUTUBE_COOKIES`.
   - Logs show whether tabs were detected; if the first cookie line has 0 tabs, the secret was pasted incorrectly.

3. **Build Failures**
   - Hugging Face terminates builds when secrets exceed ~16 KB or contain invalid UTF-8.
   - Re-encoding cookies fixed the issue; doc updates now instruct Base64 by default.

4. **SDK Switching Lessons**
   - Gradio’s auto-runner binds to the same port as uvicorn. If we return to Gradio, expose a `demo` object instead of calling `uvicorn.run()` manually.
   - For now, Docker SDK + explicit CMD is the only supported flow.

5. **Database Integrity**
   - `Video` must exist before `Transcript` or the React modal will show “Has transcript: Yes / Has video: No”.
   - Prisma migration `20251123025258_add_transcript_table` plus the upsert logic ensures consistent UI.

6. **SABR / Partial Transcripts**
   - yt-dlp logs: `WARNING: Only images are available for download. ... n challenge solving failed`.
   - Without a JS solver runtime (Node, quickjs, etc.) or alternate extractor, Whisper only receives the intro (first audio chunk).
   - Worker now warns when actual word count < 30% of expected (based on duration). Consider surfacing this flag in the UI to prompt manual retry.

## Current Known Issues / Watch List

1. **SABR Challenge Solving**
   - Potential fixes: bundle `node` binary + yt-dlp JS solver, use `youtubei.js`, or proxy downloads through an external service.
   - Tracking item: add optional `YTDLP_JS_RUNTIME=node` env once solver is bundled.

2. **Cookie Rotation Cadence**
   - Cookies expire every ~72 hours. Keep a rotation calendar; instructions live in `docs/HUGGINGFACE_SPACE_SETUP.md`.

3. **Factory Rebuilds**
   - Triggered manually via Hugging Face UI; wipes Docker cache. Expect first transcription after rebuild to download Whisper weights (~800 MB).

4. **Alternative Hosting**
   - Railway, Render, and Fly.io were evaluated and remain viable fallbacks if Spaces changes policies again. DNS fix + root user is working today, but a migration plan lives in the same doc for future use.

## Verification Checklist (Run After Each Deployment)

1. `curl https://<space>/` → returns `status: ok` and cookie metadata.
2. `node test_worker_connection.cjs` → prints health + sample transcription stats.
3. Queue a known-good short video (`tPEE9ZwTmy0`). Check:
   - Worker logs show cookie detection, yt-dlp format list, no SABR warnings.
   - Prisma tables contain `Video` + `Transcript`.
   - Transcript modal renders title, channel, content > 1000 chars.
4. Queue a 10+ minute video to confirm duration guard rails (`MAX_DURATION_SECONDS = 900`).

## Commands & Log Snippets

```bash
# Rotate cookies
python3 filter_active_cookies.py cookies-raw.txt youtube-cookie-active.txt
base64 youtube-cookie-active.txt > youtube-cookie-active.b64

# Push worker update
cd huggingface-space
git add Dockerfile app.py requirements.txt packages.txt
git commit -m "Describe change"
git push origin main

# Run end-to-end test
node test_worker_connection.cjs
```

Key log indicators to watch in Hugging Face:

- `INFO:tubetime_worker:YOUTUBE_COOKIES secret found (length: XXXX chars)`
- `WARNING: [youtube] ... SABR ... Only images are available for download`
- `Transcription may be incomplete: expected ~NNN words, got MMM words`

## Migration Matrix (if Spaces regresses)

| Platform | Pros | Cons | Notes |
|----------|------|------|-------|
| Railway | Docker deploy, cron jobs, persistent storage options | Free tier sleeps after inactivity | Minimal changes; copy same Dockerfile. |
| Render | Docker or native Python, easy secret management | Cold starts on free tier | Provide build command `pip install -r requirements.txt`. |
| Fly.io | Global Anycast, secrets, volumes | Requires Fly CLI + wireguard | Could run multiple regions for redundancy. |

## Reference Docs

- `docs/HUGGINGFACE_SPACE_SETUP.md` – canonical deployment steps, cookie prep, DNS notes.
- `docs/QUICK_DEPLOY_GUIDE.md` – abbreviated checklist.
- `README.md` – high-level architecture + current status.
- `docs/CONTEXT.md` – historical timeline with lessons learned.

## Action Items for New Developers

1. Follow the setup guide to rebuild if necessary.
2. Keep cookies fresh (script + Base64).
3. Investigate SABR mitigation (JS runtime, proxy, or alternate extractor).
4. Consider persisting “incomplete transcript” flag in Prisma for better UX.
5. Evaluate secondary hosting if uptime requirements increase.

With these notes, a new teammate should be able to reason about any future regression, know which fixes are intentional, and where to look next. If something unexpected appears, cross-check the worker logs first, then this document for historical context. 

