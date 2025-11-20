import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Helper to get user ID from session
async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

// GET /api/favorites/[id] - Get specific favorite
export async function GET(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: favoriteId } = params;

    const favorite = await prisma.favorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found.' }, { status: 404 });
    }

    if (favorite.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(favorite);
  } catch (error) {
    console.error('Error fetching favorite:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch favorite.' }, { status: 500 });
  }
}

// PUT /api/favorites/[id] - Update favorite
export async function PUT(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: favoriteId } = params;
    const { name, data } = await request.json();

    // Verify ownership
    const favorite = await prisma.favorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found.' }, { status: 404 });
    }

    if (favorite.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update favorite
    const updateData = {};
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Favorite name is required.' }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (data !== undefined) {
      if (!data || typeof data !== 'object') {
        return NextResponse.json({ error: 'Favorite data must be an object.' }, { status: 400 });
      }
      updateData.data = data;
    }

    const updated = await prisma.favorite.update({
      where: { id: favoriteId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating favorite:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Favorite not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update favorite.' }, { status: 500 });
  }
}

// DELETE /api/favorites/[id] - Delete specific favorite
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: favoriteId } = params;

    // Verify ownership
    const favorite = await prisma.favorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found.' }, { status: 404 });
    }

    if (favorite.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.favorite.delete({
      where: { id: favoriteId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Favorite not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete favorite.' }, { status: 500 });
  }
}

