# Use Python 3.11 standard image (not slim) for better networking support
FROM python:3.11

# Set working directory
WORKDIR /app

# Configure DNS servers BEFORE installing packages
# This ensures DNS resolution works from the start
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    echo "nameserver 8.8.4.4" >> /etc/resolv.conf && \
    echo "nameserver 1.1.1.1" >> /etc/resolv.conf || true

# Install system dependencies
# ffmpeg is required by yt-dlp for audio extraction
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Set environment variables
ENV PYTHONUNBUFFERED=1
# Hugging Face Spaces sets the PORT env var, but we default to 7860
ENV PORT=7860

# Configure DNS at runtime as well (in case /etc/resolv.conf gets overwritten)
# Create startup script to ensure DNS is configured before uvicorn starts
RUN printf '#!/bin/sh\n\
echo "nameserver 8.8.8.8" > /etc/resolv.conf\n\
echo "nameserver 8.8.4.4" >> /etc/resolv.conf\n\
echo "nameserver 1.1.1.1" >> /etc/resolv.conf\n\
exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}\n' > /start.sh && \
    chmod +x /start.sh

# Run the startup script
CMD ["/start.sh"]
