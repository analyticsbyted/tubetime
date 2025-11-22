# Phase 6 – Testing & Cron Automation Checklist

This document captures the manual verification steps and cron setup instructions for the Phase 6 transcription pipeline. Complete each section before final sign‑off.

---

## 1. Environment Prep

1. `cp .env.example .env.local` (if needed) and ensure the following variables are present:
   - `HUGGINGFACE_WORKER_URL` (or the names already defined in `.env`)
   - `HUGGINGFACE_WORKER_SECRET`
   - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, OAuth keys, etc.
2. Run database migrations:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
3. Deploy the Hugging Face Space (see `huggingface-space/README.md`) and copy its URL into the env file.

---

## 2. Manual Test Matrix

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Queue within limit | Select ≤15 min videos → “Queue for Transcription” | Success toast, selection cleared, `/api/transcription-queue` shows `pending` item, worker status reflects increment |
| 2 | Frontend rejection (>15 min) | Try queuing a video >15 min (duration shown in UI) | Toast error: “exceed the 15 minute transcription limit”; no API call |
| 3 | Missing duration metadata | Queue immediately after a search (before duration is fetched) | Toast error about missing metadata; item not queued |
| 4 | Worker download guard | Temporarily bypass frontend (use REST call) with >15 min video | Worker responds 400 “Video exceeds 15-minute limit”; queue item marked `failed` |
| 5 | Transcript caching | Queue the same video twice | First run → `completed`, second run → result status `cached` and immediate completion |
| 6 | Retry logic | Temporarily break worker secret so it returns 401 | Queue item moves to `pending` with incremented `retryCount`; after three attempts it becomes `failed` |
| 7 | Hugging Face health endpoint | `GET /api/transcription-worker` | JSON response with queue counts, worker health payload |
| 8 | Manual worker trigger | `POST /api/transcription-worker` from CLI (with secret) | Processes at most 5 items, returns counts for processed/completed/failed |
| 9 | UI state sync | Sign out, attempt queue | Error toast requiring auth; `/api/transcription-queue` not called |
|10 | Observability | Check logs (Next.js + Hugging Face) | INFO/WARN/ERROR entries for download, transcription, failures |

> Note: Automated tests were **not run** in this environment per project instructions. Please execute the manual plan above.

---

## 3. Cron Automation (Vercel)

1. Create `vercel.json` (if not already present) with a cron entry:
   ```json
   {
     "crons": [
       {
         "path": "/api/transcription-worker",
         "schedule": "*/5 * * * *"
       }
     ]
   }
   ```
2. Deploy to Vercel. The cron job will call the route every 5 minutes with the secret header:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer $HUGGINGFACE_WORKER_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"maxItems":3}' \
     https://your-app.vercel.app/api/transcription-worker
   ```
3. Monitor `vercel logs` plus the Hugging Face console for the first few runs.

---

## 4. Sign-off Checklist

- [ ] Manual tests executed and issues logged (if any)
- [ ] Cron job enabled in production
- [ ] Worker health verified post-cron deployment
- [ ] Documentation updated (this file + `PHASE6_PLAN_REVIEW.md`)

Once all boxes are checked, Phase 6 is fully complete. 🎉

