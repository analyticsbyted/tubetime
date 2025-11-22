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

// GET /api/transcripts - List all user's transcripts
export async function GET(request) {
  try {
    const userId = await getUserId();

    // Optional query params for filtering (future enhancement)
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where = {};
    if (language) {
      where.language = language;
    }

    // Fetch transcripts with video relations
    // Note: Transcripts are not user-scoped in the schema (they're shared per video)
    // But we can filter by videos that the user has queued or favorited
    // For MVP, we'll return all transcripts (they're public/shared per video)
    // Future: Could add user-specific filtering if needed

    const [transcripts, total] = await Promise.all([
      prisma.transcript.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transcript.count({ where }),
    ]);

    return NextResponse.json({
      transcripts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Error fetching transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcripts.' },
      { status: 500 }
    );
  }
}

