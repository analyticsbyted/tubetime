# Hugging Face Space Worker Setup Guide

This guide walks you through setting up the transcription worker on Hugging Face Spaces.

## Prerequisites

- Hugging Face account (sign up at https://huggingface.co/join)
- Access to your local `.env` file

## Step-by-Step Setup

### Step 1: Create the Hugging Face Space

1. Go to https://huggingface.co/spaces
2. Click **"Create new Space"**
3. Fill in the form:
   - **Owner:** Your Hugging Face username
   - **Space name:** `tubetime-transcription-worker` (or your preferred name)
   - **SDK:** Select **"Docker"** (this is important!)
   - **Visibility:** **Private** (recommended for security)
   - **License:** MIT (or your choice)
4. Click **"Create Space"**

### Step 2: Upload the Code

You have two options:

**Option A: Web UI (Easiest)**
1. In your new Space, click **"Files and versions"** tab
2. Click **"Add file"** → **"Upload files"**
3. Upload these files from `huggingface-space/`:
   - `Dockerfile`
   - `app.py`
   - `requirements.txt`
   - `.dockerignore` (optional but recommended)

**Option B: Git (Recommended for updates)**
1. In your Space, go to **"Files and versions"** tab
2. Copy the git clone URL shown
3. In your terminal:
   ```bash
   cd huggingface-space
   git clone <your-space-git-url> .
   # Or if you want to keep it separate:
   git clone <your-space-git-url> ../hf-space-deploy
   cd ../hf-space-deploy
   ```
4. Copy files:
   ```bash
   cp Dockerfile app.py requirements.txt .dockerignore .
   ```
5. Commit and push:
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push
   ```

### Step 3: Generate and Set the Secret

1. **Generate a secure secret:**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output - you'll need it in two places.

2. **Add secret to Hugging Face Space:**
   - In your Space, go to **"Settings"** → **"Variables and secrets"**
   - Click **"Add new secret"**
   - **Key:** `TRANSCRIPTION_WORKER_SECRET`
   - **Value:** Paste the secret you generated
   - Click **"Add secret"**

3. **Save the secret** - you'll also need it for your local `.env` file.

### Step 4: Wait for Deployment

1. After uploading files, Hugging Face Spaces will automatically start building
2. Go to the **"Logs"** tab to watch the build progress
3. The first build takes 5-10 minutes (downloading dependencies, building Docker image)
4. Wait until you see "Application startup complete" in the logs

### Step 5: Get Your Space URL

1. Once deployed, your Space will have a URL like:
   ```
   https://yourusername-tubetime-transcription-worker.hf.space
   ```
2. Copy this URL - you'll need it for your local environment

### Step 6: Update Local Environment

1. Open your `.env` file (or create it if it doesn't exist)
2. Add these two lines:
   ```env
   TRANSCRIPTION_WORKER_URL="https://yourusername-tubetime-transcription-worker.hf.space"
   TRANSCRIPTION_WORKER_SECRET="paste-the-secret-you-generated-here"
   ```
3. **Important:** Use the exact same secret value you set in the Hugging Face Space!

**Note:** This project uses `.env` (not `.env.local`) for environment variables.

### Step 7: Test the Connection

1. **Test the worker health:**
   ```bash
   curl https://yourusername-tubetime-transcription-worker.hf.space/
   ```
   Should return: `{"status":"ok","model":"distil-whisper/distil-medium.en","device":"cpu"}`

2. **Test transcription (requires secret):**
   ```bash
   curl -X POST https://yourusername-tubetime-transcription-worker.hf.space/transcribe \
     -H "Authorization: Bearer YOUR_SECRET_HERE" \
     -H "Content-Type: application/json" \
     -d '{"videoId":"dQw4w9WgXcQ"}'
   ```

3. **Test from your Next.js app:**
   - Restart your Next.js dev server: `npm run dev`
   - Queue a video for transcription
   - Check the browser console and network tab for any errors

## Troubleshooting

### Build Fails

- **Check logs:** Go to "Logs" tab in your Space
- **Common issues:**
  - Missing `Dockerfile` - make sure you uploaded it
  - Wrong SDK selected - must be "Docker", not "Gradio" or "Streamlit"
  - Syntax errors in `app.py` - check Python syntax

### Worker Returns 401 Unauthorized

- **Check secret:** Make sure `TRANSCRIPTION_WORKER_SECRET` in `.env` matches the secret in Hugging Face Space
- **Check environment variables:** Restart your Next.js server after updating `.env`

### Worker Returns 500 Errors

- **Check Space logs:** Go to "Logs" tab to see error details
- **Common causes:**
  - Video not found (404 from YouTube)
  - Video too long (>15 minutes)
  - Out of memory (free tier has limits)
  - Model download failed (first request may take longer)

### Slow Performance

- **First request:** The first transcription is slow because the model needs to be downloaded
- **CPU-only:** Free tier runs on CPU, which is slower than GPU
- **Video length:** Longer videos take more time to process

## Updating the Worker

If you need to update the code:

1. **Via Git:**
   ```bash
   cd huggingface-space  # or your git clone location
   # Make your changes
   git add .
   git commit -m "Update worker code"
   git push
   ```

2. **Via Web UI:**
   - Go to "Files and versions" tab
   - Click on the file you want to edit
   - Click "Edit" button
   - Make changes and commit

3. **Spaces will automatically rebuild** after you push changes

## Cost Considerations

- **Free tier:** Limited CPU time, may have rate limits
- **Upgrade:** If you need more resources, consider upgrading to a paid Hugging Face Space
- **Alternative:** Self-host on your own server for unlimited usage

## Security Notes

- **Keep the secret secure:** Never commit `TRANSCRIPTION_WORKER_SECRET` to git
- **Private Space:** Keep your Space private to prevent unauthorized access
- **Rate limiting:** Consider adding rate limiting if you make the Space public

## Next Steps

Once your worker is deployed and tested:

1. Queue some videos for transcription in your app
2. Watch the progress panel update in real-time
3. Check that transcripts are being generated successfully
4. Monitor the Space logs for any issues

## Support

If you encounter issues:
1. Check the Space logs first
2. Verify all environment variables are set correctly
3. Test the worker directly with curl
4. Check the main project README for troubleshooting tips

