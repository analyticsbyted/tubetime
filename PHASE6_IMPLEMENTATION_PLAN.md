# Phase 6 Implementation Plan (Revised): Self-Hosted Transcription Worker

**Objective:** To implement a scalable, cloud-based, and cost-free transcription pipeline by integrating an open-source Whisper model hosted on a free cloud service. This revision moves away from a paid third-party API (like OpenAI) and a non-feasible local installation.

---

### 1. Revised Architecture

We will adopt a decoupled, two-part architecture consisting of our primary Next.js application and a separate, dedicated Python transcription service hosted on **Hugging Face Spaces**.

**Workflow:**
1.  A cron job triggers the **Next.js Worker Endpoint**.
2.  The endpoint fetches a pending job from the `TranscriptionQueue` in the database.
3.  The endpoint makes a secure HTTP request to our **Python Worker on Hugging Face Spaces**, passing the YouTube video ID.
4.  The Python worker downloads the audio, transcribes it using a self-hosted Whisper model, and returns the transcript data.
5.  The Next.js endpoint receives the data and updates the database, marking the job as 'completed' or 'failed'.

```
+---------------------------+      +---------------------------------+      +--------------------------------+
|  Next.js App (Vercel)     |      | Python Worker (HF Spaces)       |      |    YouTube & Other Services    |
|---------------------------|      |---------------------------------|      |--------------------------------|
|                           |      |                                 |      |                                |
|  [Cron Job] triggers -->  |      |                                 |      |                                |
|  /api/transcription-worker| ===> | POST /transcribe                | ---> | 1. Download audio from YouTube |
|                           |      | (Receives video_id)             |      |                                |
|  1. Fetch job from DB     |      |                                 |      |                                |
|  2. Call Python Worker    |      | 2. Run Whisper Model Inference  |      |                                |
|  3. Update DB with result |      |                                 |      |                                |
|                           | <=== | (Returns transcript JSON)       |      |                                |
|                           |      |                                 |      |                                |
+---------------------------+      +---------------------------------+      +--------------------------------+
```

---

### 2. Database Schema Changes

To store the transcription results, a new `Transcript` model will be created.

*   **Model:** `Transcript`
*   **Relationship:** One-to-One with the `Video` model.
*   **Fields:**
    *   `id`: Unique identifier (cuid).
    *   `content`: The full, plain-text transcript (String, very long).
    *   `segments`: Timestamped segments of the transcript (JSON).
    *   `language`: Detected language of the audio (String).
    *   `confidence`: Average confidence score of the transcription (Float).
    *   `duration`: Duration of the transcribed audio in seconds (Float).
    *   `wordCount`: Total number of words in the transcript (Int).
    *   `videoId`: Foreign key linking to the `Video` model (String, unique).
    *   `createdAt` / `updatedAt`: Standard timestamps.

---

### 3. Component Breakdown & Implementation Steps

#### **Part A: The Python Worker (Hugging Face Space)**

1.  **Setup Hugging Face Space:**
    *   Create a new public Space on the Hugging Face Hub.
    *   Configure it to use a Docker template or a standard Python environment.

2.  **Define Dependencies (`requirements.txt`):**
    *   `fastapi`: For creating the API server.
    *   `uvicorn`: For running the FastAPI server.
    *   `transformers`: To download and use the Whisper model.
    *   `torch`: The core machine learning library.
    *   `yt-dlp`: A maintained and reliable library for downloading video audio from YouTube.
    *   `ffmpeg-python`: Required by Whisper for audio processing.

3.  **Select ML Model:**
    *   To stay within the resource limits of the Hugging Face free tier, we will use a distilled version of Whisper, such as **`distil-whisper/distil-medium.en`**. This model offers a great balance between accuracy and performance on CPU hardware.

4.  **Implement the FastAPI Server (`app.py`):**
    *   The application will load the Whisper model into memory on startup.
    *   It will expose a single endpoint: `POST /transcribe`.
    *   This endpoint will require a secret token in the `Authorization` header for security.
    *   **Logic:**
        1.  Receive and validate the request (check secret token and `video_id`).
        2.  Use `yt-dlp` to download the audio of the YouTube video to a temporary in-memory or on-disk location.
        3.  Run the audio through the loaded Whisper pipeline for transcription.
        4.  Return the complete transcript, including segments and metadata, as a JSON response.

#### **Part B: The Next.js Application**

5.  **Configure Environment:**
    *   Add two new variables to the project's `.env` file:
        *   `TRANSCRIPTION_WORKER_URL`: The public URL of the deployed Hugging Face Space.
        *   `TRANSCRIPTION_WORKER_SECRET`: The shared secret key to authenticate requests between the Next.js app and the Python worker.

6.  **Create Transcription Service:**
    *   Develop a new `src/services/transcriptionService.js` file.
    *   This service will contain one primary function, `getTranscript(videoId)`, which handles the `fetch` call to the `TRANSCRIPTION_WORKER_URL`. It will include the secret token in the headers and have a long timeout (e.g., 90-120 seconds) to accommodate for "cold starts" and slow transcription times.

7.  **Update the Worker Endpoint:**
    *   Refactor `/api/transcription-worker/route.js`.
    *   Its main logic will now call `transcriptionService.getTranscript()`.
    *   The existing logic for fetching a `pending` job and updating it to `processing`, `completed`, or `failed` will be preserved and adapted.

---

### 4. Key Questions for Review

1.  **Model Choice:** Is the proposed `distil-whisper/distil-medium.en` model an acceptable balance of speed vs. accuracy for the MVP, given the limitations of free hardware?
2.  **Cost vs. Performance Trade-off:** Is the team in agreement that a $0 cost for transcription is worth the trade-off of slower performance and potential "cold start" delays from the Hugging Face service?
3.  **Timeout Handling:** What is an acceptable timeout threshold for the request to the Python worker? I suggest **90 seconds** as a starting point to account for cold starts and transcription time for a moderately long video.
4.  **UI for Failures:** How should the user interface display a video that failed transcription due to a worker timeout or a resource error? (e.g., A "Failed" status with a "Retry" button).
