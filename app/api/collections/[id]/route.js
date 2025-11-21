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

// GET /api/collections/[id] - Get a specific collection
export async function GET(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: collectionId } = params;

    const collection = await authorizeCollection(userId, collectionId);

    const fullCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        videos: {
          include: {
            video: true,
          },
          orderBy: { assignedAt: 'asc' }, // Order videos within collection
        }
      }
    });

    return NextResponse.json(fullCollection);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error fetching collection by ID:', error);
    return NextResponse.json({ error: 'Failed to fetch collection.' }, { status: 500 });
  }
}

// PUT /api/collections/[id] - Update a specific collection (e.g., rename)
export async function PUT(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: collectionId } = params;
    const { name } = await request.json();

    await authorizeCollection(userId, collectionId); // Checks ownership

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Collection name is required.' }, { status: 400 });
    }

    const updatedCollection = await prisma.collection.update({
      where: { id: collectionId },
      data: { name: name.trim() },
    });

    return NextResponse.json(updatedCollection);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Error updating collection:', error);
    return NextResponse.json({ error: 'Failed to update collection.' }, { status: 500 });
  }
}

// DELETE /api/collections/[id] - Delete a specific collection
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: collectionId } = params;

    await authorizeCollection(userId, collectionId); // Checks ownership

    await prisma.collection.delete({
      where: { id: collectionId },
    });

    return new NextResponse(null, { status: 204 }); // No content on successful delete
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // P2025 means record not found for delete
    if (error.code === 'P2025') return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
    console.error('Error deleting collection:', error);
    return NextResponse.json({ error: 'Failed to delete collection.' }, { status: 500 });
  }
}
