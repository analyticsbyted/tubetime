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

// GET /api/collections - List user's collections
export async function GET(request) {
  try {
    const userId = await getUserId();
    const collections = await prisma.collection.findMany({
      where: { userId },
      include: {
        videos: { // Include videos associated with the collection
          include: {
            video: true, // Include actual video data
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(collections);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections.' }, { status: 500 });
  }
}

// POST /api/collections - Create new collection
export async function POST(request) {
  try {
    const userId = await getUserId();
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Collection name is required.' }, { status: 400 });
    }

    const newCollection = await prisma.collection.create({
      data: {
        name: name.trim(),
        userId,
      },
    });
    return NextResponse.json(newCollection, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Failed to create collection.' }, { status: 500 });
  }
}

// You will also need route handlers for specific collection IDs
// e.g., for GET, PUT, DELETE /api/collections/[id]
// and POST /api/collections/[id]/videos
// These will be in a separate file like `app/api/collections/[id]/route.js`
// I will create that file in the next step.
