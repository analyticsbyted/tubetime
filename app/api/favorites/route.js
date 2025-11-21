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

// GET /api/favorites - Get user's favorites
export async function GET(request) {
  try {
    const userId = await getUserId();
    
    // Optional query params for filtering
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'search' or 'channel'
    
    const where = { userId };
    if (type && (type === 'search' || type === 'channel')) {
      where.type = type;
    }
    
    const favorites = await prisma.favorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(favorites);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites.' }, { status: 500 });
  }
}

// POST /api/favorites - Create new favorite
export async function POST(request) {
  try {
    const userId = await getUserId();
    const { name, type, data } = await request.json();

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Favorite name is required.' }, { status: 400 });
    }

    if (type !== 'search' && type !== 'channel') {
      return NextResponse.json({ error: 'Favorite type must be "search" or "channel".' }, { status: 400 });
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Favorite data is required.' }, { status: 400 });
    }

    // Check if favorite already exists (by name and type for this user)
    const existing = await prisma.favorite.findFirst({
      where: {
        userId,
        name: name.trim(),
        type,
      },
    });

    if (existing) {
      // Update existing favorite
      const updated = await prisma.favorite.update({
        where: { id: existing.id },
        data: {
          data,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated, { status: 200 });
    }

    // Create new favorite
    const newFavorite = await prisma.favorite.create({
      data: {
        userId,
        name: name.trim(),
        type,
        data,
      },
    });

    return NextResponse.json(newFavorite, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error saving favorite:', error);
    return NextResponse.json({ error: 'Failed to save favorite.' }, { status: 500 });
  }
}

// DELETE /api/favorites - Clear all favorites for user (optional, not in UI yet)
export async function DELETE(request) {
  try {
    const userId = await getUserId();
    
    await prisma.favorite.deleteMany({
      where: { userId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error clearing favorites:', error);
    return NextResponse.json({ error: 'Failed to clear favorites.' }, { status: 500 });
  }
}

