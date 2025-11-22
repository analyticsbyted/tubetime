import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Helper to get user ID from session
async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

// GET /api/transcripts/[videoId] - Get transcript for a specific video
export async function GET(request, { params }) {
  try {
    const userId = await getUserId();
    const { videoId } = params;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required.' },
        { status: 400 }
      );
    }

    // Fetch transcript with video relation
    const transcript = await prisma.transcript.findUnique({
      where: { videoId },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            channelTitle: true,
            publishedAt: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found for this video.' },
        { status: 404 }
      );
    }

    // Return transcript with video metadata
    return NextResponse.json(transcript);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript.' },
      { status: 500 }
    );
  }
}

