// No imports needed for Node 18+ 
const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    });
    return envVars;
  } catch (e) {
    console.error('Could not read .env file');
    return {};
  }
}

const env = loadEnv();
const WORKER_URL = env.TRANSCRIPTION_WORKER_URL;
const WORKER_SECRET = env.TRANSCRIPTION_WORKER_SECRET;

if (!WORKER_URL || !WORKER_SECRET) {
  console.error('❌ Missing WORKER_URL or WORKER_SECRET in .env');
  process.exit(1);
}

console.log(`Testing connection to: ${WORKER_URL}`);

async function testHealth() {
  console.log('\n--- Testing Health Endpoint (GET /) ---');
  try {
    const response = await fetch(WORKER_URL);
    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);
    if (response.ok) {
      console.log('✅ Health check passed');
    } else {
      console.error('❌ Health check failed');
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function testTranscribe() {
  console.log('\n--- Testing Transcribe Endpoint (POST /transcribe) ---');
  // Use a very short, known public video to test (Shortest video on YouTube)
  const VIDEO_ID = 'tPEE9ZwTmy0'; 
  
  try {
    const response = await fetch(`${WORKER_URL}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`
      },
      body: JSON.stringify({ videoId: VIDEO_ID })
    });
    
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Transcription request successful!');
      console.log('Data:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.error(`❌ Request failed: ${text}`);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function main() {
  await testHealth();
  await testTranscribe();
}

main();