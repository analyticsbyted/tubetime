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

// Valid status transitions
const VALID_STATUS_TRANSITIONS = {
  pending: ['processing'],
  processing: ['completed', 'failed'],
  failed: ['pending'], // Allow retry
  completed: [], // Completed items cannot transition (would need to be re-queued as new item)
};

/**
 * Validates status transition
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - Desired new status
 * @returns {boolean} True if transition is valid
 */
function isValidStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

// GET /api/transcription-queue/[id] - Get specific queue item
export async function GET(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: queueItemId } = params;

    const queueItem = await prisma.transcriptionQueue.findUnique({
      where: { id: queueItemId },
      include: {
        video: true,
      },
    });

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found.' }, { status: 404 });
    }

    if (queueItem.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(queueItem);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching queue item:', error);
    return NextResponse.json({ error: 'Failed to fetch queue item.' }, { status: 500 });
  }
}

// PUT /api/transcription-queue/[id] - Update queue item
export async function PUT(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: queueItemId } = params;
    const { status, priority, errorMessage } = await request.json();

    // Verify ownership
    const queueItem = await prisma.transcriptionQueue.findUnique({
      where: { id: queueItemId },
    });

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found.' }, { status: 404 });
    }

    if (queueItem.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate status transition if status is being updated
    if (status !== undefined) {
      if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status. Must be: pending, processing, completed, or failed.' }, { status: 400 });
      }

      if (status !== queueItem.status && !isValidStatusTransition(queueItem.status, status)) {
        return NextResponse.json({ 
          error: `Invalid status transition from "${queueItem.status}" to "${status}".` 
        }, { status: 400 });
      }
    }

    // Validate priority
    if (priority !== undefined) {
      if (typeof priority !== 'number' || priority < 0) {
        return NextResponse.json({ error: 'Priority must be a non-negative number.' }, { status: 400 });
      }
    }

    // Build update data
    const updateData = {};
    if (status !== undefined) {
      updateData.status = status;
      // Set completedAt if status is completed
      if (status === 'completed') {
        updateData.completedAt = new Date();
      } else if (queueItem.status === 'completed' && status !== 'completed') {
        // Clear completedAt if moving away from completed
        updateData.completedAt = null;
      }
    }
    if (priority !== undefined) {
      updateData.priority = priority;
    }
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }

    const updated = await prisma.transcriptionQueue.update({
      where: { id: queueItemId },
      data: updateData,
      include: {
        video: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Queue item not found.' }, { status: 404 });
    }
    console.error('Error updating queue item:', error);
    return NextResponse.json({ error: 'Failed to update queue item.' }, { status: 500 });
  }
}

// DELETE /api/transcription-queue/[id] - Remove specific queue item
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    const { id: queueItemId } = params;

    // Verify ownership
    const queueItem = await prisma.transcriptionQueue.findUnique({
      where: { id: queueItemId },
    });

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found.' }, { status: 404 });
    }

    if (queueItem.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.transcriptionQueue.delete({
      where: { id: queueItemId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      // Expected for unauthenticated users - don't log as error
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Queue item not found.' }, { status: 404 });
    }
    console.error('Error deleting queue item:', error);
    return NextResponse.json({ error: 'Failed to delete queue item.' }, { status: 500 });
  }
}

