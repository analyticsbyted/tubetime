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

// DELETE /api/search-history/[id] - Delete a specific search history entry
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: historyId } = params;

    const entry = await prisma.searchHistory.findUnique({
      where: { id: historyId },
    });

    if (!entry || entry.userId !== userId) {
      return NextResponse.json({ error: 'Search history entry not found or unauthorized.' }, { status: 404 });
    }

    await prisma.searchHistory.delete({
      where: { id: historyId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting search history entry:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete search history entry.' }, { status: 500 });
  }
}