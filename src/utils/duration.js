const DURATION_REGEX = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;

export const MAX_TRANSCRIPTION_DURATION_SECONDS = 15 * 60; // 15 minutes

export function parseISODurationToSeconds(duration) {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return duration;
  }

  if (typeof duration !== 'string') {
    return null;
  }

  const match = duration.match(DURATION_REGEX);
  if (!match) {
    return null;
  }

  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);

  return hours * 3600 + minutes * 60 + seconds;
}

