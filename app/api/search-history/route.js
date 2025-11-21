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

// Function to clean up old history entries
async function cleanupSearchHistory(userId) {
  const historyCount = await prisma.searchHistory.count({
    where: { userId },
  });

  const MAX_HISTORY_ENTRIES = 50; // As per MIGRATION_PLAN.md

  if (historyCount > MAX_HISTORY_ENTRIES) {
    const oldestEntries = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: historyCount - MAX_HISTORY_ENTRIES,
    });
    await prisma.searchHistory.deleteMany({
      where: {
        id: {
          in: oldestEntries.map(entry => entry.id),
        },
      },
    });
  }
}

// GET /api/search-history - List user's search history
export async function GET(request) {
  try {
    const userId = await getUserId();
    const history = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Only keep last 50 entries
    });
    return NextResponse.json(history);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching search history:', error);
    return NextResponse.json({ error: 'Failed to fetch search history.' }, { status: 500 });
  }
}

// POST /api/search-history - Save new search history entry (with duplicate detection)
export async function POST(request) {
  try {
    const userId = await getUserId();
    const { query, channelName, startDate, endDate, duration, language, order, maxResults } = await request.json();

    // Check for duplicate search within a short period (e.g., 1 minute)
    const ONE_MINUTE_AGO = new Date(Date.now() - 60 * 1000);
    const existingEntry = await prisma.searchHistory.findFirst({
      where: {
        userId,
        query,
        channelName,
        startDate,
        endDate,
        duration,
        language,
        order,
        maxResults,
        createdAt: {
          gte: ONE_MINUTE_AGO,
        },
      },
    });

    if (existingEntry) {
      // If duplicate, update timestamp instead of creating new entry
      const updatedEntry = await prisma.searchHistory.update({
        where: { id: existingEntry.id },
        data: { createdAt: new Date() },
      });
      return NextResponse.json(updatedEntry, { status: 200 }); // Return 200 OK for update
    }

    const newEntry = await prisma.searchHistory.create({
      data: {
        userId,
        query: query || null,
        channelName: channelName || null,
        startDate: startDate || null,
        endDate: endDate || null,
        duration: duration || null,
        language: language || null,
        order: order || null,
        maxResults: maxResults || null,
      },
    });

    // Clean up old entries
    await cleanupSearchHistory(userId);

    return NextResponse.json(newEntry, { status: 201 }); // Return 201 Created for new entry
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error saving search history:', error);
    return NextResponse.json({ error: 'Failed to save search history.' }, { status: 500 });
  }
}

// DELETE /api/search-history - Clear all search history for user
export async function DELETE(request) {
  try {
    const userId = await getUserId();
    await prisma.searchHistory.deleteMany({
      where: { userId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error clearing search history:', error);
    return NextResponse.json({ error: 'Failed to clear search history.' }, { status: 500 });
  }
}