import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Helper to get user ID from session
async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

// Helper to validate collection ownership
async function authorizeCollection(userId, collectionId) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });
  if (!collection || collection.userId !== userId) {
    throw new Error('Forbidden');
  }
  return collection;
}

// POST /api/collections/[id]/videos - Add videos to a specific collection
export async function POST(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: collectionId } = params;
    const { videoId, title, channelTitle, publishedAt, thumbnailUrl } = await request.json();

    // Validate input
    if (!videoId || !title || !channelTitle || !publishedAt || !thumbnailUrl) {
      return NextResponse.json({ error: 'Missing video details.' }, { status: 400 });
    }

    await authorizeCollection(userId, collectionId); // Checks ownership

    // Upsert the video: create if not exists, update if exists (to ensure metadata is fresh)
    const video = await prisma.video.upsert({
      where: { id: videoId },
      update: { title, channelTitle, publishedAt, thumbnailUrl },
      create: { id: videoId, title, channelTitle, publishedAt, thumbnailUrl },
    });

    // Connect the video to the collection via the join table
    await prisma.videosInCollections.create({
      data: {
        videoId: video.id,
        collectionId: collectionId,
      },
    });

    return NextResponse.json({ message: 'Video added to collection successfully.', video }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // Handle case where video is already in collection (unique constraint violation)
    if (error.code === 'P2002' && error.meta?.target?.includes('videoId') && error.meta?.target?.includes('collectionId')) {
      return NextResponse.json({ error: 'Video is already in this collection.' }, { status: 409 });
    }
    console.error('Error adding video to collection:', error);
    return NextResponse.json({ error: 'Failed to add video to collection.' }, { status: 500 });
  }
}
