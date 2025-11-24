# Quick Deploy Guide: Hugging Face Space

**Time Required:** ~15 minutes  
**Difficulty:** Easy (just follow the steps)

## Prerequisites Checklist

- [ ] Hugging Face account (sign up at https://huggingface.co/join if needed)
- [ ] Files ready in `huggingface-space/` directory:
  - [ ] `Dockerfile`
  - [ ] `app.py`
  - [ ] `requirements.txt`
  - [ ] `.dockerignore` (optional)

## Step-by-Step Deployment

### Step 1: Create the Space (2 minutes)

1. **Go to:** https://huggingface.co/spaces
2. **Click:** "Create new Space" button (top right)
3. **Fill in the form:**
   - **Owner:** Select your username
   - **Space name:** `tubetime-transcription-worker` (or your choice)
   - **SDK:** **Select "Docker"** ⚠️ (This is critical!)
   - **Visibility:** **Private** (recommended)
   - **License:** MIT (or your choice)
4. **Click:** "Create Space" button

### Step 2: Upload Files (3 minutes)

**Option A: Web UI (Easiest for first time)**

1. In your new Space, you'll see a file browser
2. Click **"Add file"** → **"Upload files"**
3. Upload these 4 files from `huggingface-space/`:
   - `Dockerfile`
   - `app.py`
   - `requirements.txt`
   - `.dockerignore`
4. Click **"Commit changes to main"** button

**Option B: Git (Better for updates)**

1. In your Space, go to **"Files and versions"** tab
2. You'll see a git URL like: `https://huggingface.co/spaces/yourusername/tubetime-transcription-worker`
3. In your terminal:
   ```bash
   cd /Volumes/Samsung\ 990\ Pro/dev/tubetime/huggingface-space
   
   # Initialize git if not already
   git init
   git remote add origin https://huggingface.co/spaces/yourusername/tubetime-transcription-worker
   
   # Add and commit files
   git add Dockerfile app.py requirements.txt .dockerignore
   git commit -m "Initial deployment"
   
   # Push to Hugging Face
   git push origin main
   ```

### Step 3: Generate Secret (1 minute)

1. **Open terminal** and run:
   ```bash
   openssl rand -base64 32
   ```
2. **Copy the output** - you'll need it in two places:
   - Hugging Face Space settings
   - Your local `.env` file

### Step 4: Add Secret to Space (2 minutes)

1. In your Space, go to **"Settings"** tab (left sidebar)
2. Click **"Variables and secrets"** (under "Space settings")
3. Click **"Add new secret"** button
4. Fill in:
   - **Key:** `TRANSCRIPTION_WORKER_SECRET`
   - **Value:** Paste the secret you generated
5. Click **"Add secret"**
6. ✅ Secret is now saved

### Step 5: Wait for Build (5-10 minutes)

1. Go to **"Logs"** tab in your Space
2. You'll see the build progress:
   - Installing system packages (ffmpeg, git)
   - Installing Python dependencies (this takes longest)
   - Starting the application
3. **Wait for:** "Application startup complete" message
4. ⚠️ **First build takes 5-10 minutes** - grab a coffee!

### Step 6: Get Your Space URL (30 seconds)

1. Once build completes, your Space URL will be:
   ```
   https://yourusername-tubetime-transcription-worker.hf.space
   ```
2. **Copy this URL** - you'll need it next

### Step 7: Update Local Environment (2 minutes)

1. **Open or create** `.env` in your project root:
   ```bash
   cd /Volumes/Samsung\ 990\ Pro/dev/tubetime
   nano .env  # or use your preferred editor
   ```

2. **Add these two lines:**
   ```env
   TRANSCRIPTION_WORKER_URL="https://yourusername-tubetime-transcription-worker.hf.space"
   TRANSCRIPTION_WORKER_SECRET="paste-the-secret-you-generated-here"
   ```
   ⚠️ **Important:** Use the exact same secret from Step 3!

3. **Save the file**

**Note:** This project uses `.env` (not `.env.local`) for environment variables.

### Step 8: Test the Connection (2 minutes)

1. **Test worker health:**
   ```bash
   curl https://yourusername-tubetime-transcription-worker.hf.space/
   ```
   Should return: `{"status":"ok","model":"distil-whisper/distil-medium.en","device":"cpu"}`

2. **Restart your Next.js server:**
   ```bash
   # Stop current server (Ctrl+C), then:
   npm run dev
   ```

3. **Test in your app:**
   - Queue a video for transcription
   - Check browser console for errors
   - Watch the progress panel update

## ✅ Success Checklist

- [ ] Space created and files uploaded
- [ ] Build completed successfully (check Logs tab)
- [ ] Secret added to Space settings
- [ ] `.env` updated with URL and secret
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Next.js app can connect to worker
- [ ] Videos can be queued and processed

## Troubleshooting

### Build Fails
- **Check:** Did you select "Docker" SDK? (not Gradio/Streamlit)
- **Check:** Are all 4 files uploaded?
- **Check:** Logs tab for specific error messages

### 401 Unauthorized
- **Check:** Secret in `.env` matches Space secret exactly
- **Check:** Restarted Next.js server after updating `.env`
- **Check:** No extra spaces or quotes in secret

### 500 Errors
- **Check:** Space logs for detailed error
- **Check:** Video exists and is accessible
- **Check:** Video is under 15 minutes

### Worker Not Responding
- **Check:** Space is running (not sleeping - free tier sleeps after inactivity)
- **Check:** URL is correct (no typos)
- **Check:** Network connectivity

## Next Steps After Deployment

1. **Test with a short video** (< 2 minutes) first
2. **Monitor the Logs tab** during first transcription
3. **Check your app's progress panel** for real-time updates
4. **Verify transcript appears** when processing completes

## Need Help?

If you get stuck:
1. Check the detailed guide: `docs/HUGGINGFACE_SPACE_SETUP.md`
2. Check Space logs for error messages
3. Verify all steps above are completed
4. Test the worker directly with curl commands

---

**Ready to deploy?** Start with Step 1! 🚀

