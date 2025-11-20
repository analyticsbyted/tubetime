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

// GET /api/favorites/check - Check if a favorite exists by name and type
export async function GET(request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const type = searchParams.get('type');

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type query parameters are required.' }, { status: 400 });
    }

    if (type !== 'search' && type !== 'channel') {
      return NextResponse.json({ error: 'Type must be "search" or "channel".' }, { status: 400 });
    }

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId,
        name: name.trim(),
        type,
      },
    });

    return NextResponse.json({ 
      isFavorited: !!favorite,
      favorite: favorite || null,
    });
  } catch (error) {
    console.error('Error checking favorite:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to check favorite.' }, { status: 500 });
  }
}

