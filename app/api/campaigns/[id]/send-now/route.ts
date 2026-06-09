import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params;
  const { recipientId } = await req.json();

  if (!recipientId) return NextResponse.json({ error: 'recipientId required' }, { status: 400 });

  // Verify recipient belongs to this campaign and is still in new stage
  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, campaignId, stage: 'new' },
  });
  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found or not in new stage' }, { status: 404 });
  }

  // Get the first sequence step
  const step = await prisma.sequenceStep.findFirst({
    where: { campaignId },
    orderBy: { stepNumber: 'asc' },
  });
  if (!step) return NextResponse.json({ error: 'Campaign has no sequence steps' }, { status: 400 });

  // Create a ScheduledSend due now; cron picks it up on the next tick
  await prisma.$transaction([
    prisma.scheduledSend.create({
      data: {
        recipientId,
        stepId: step.id,
        scheduledAt: new Date(),
        status: 'pending',
      },
    }),
    prisma.recipient.update({
      where: { id: recipientId },
      data: { stage: 'in_sequence', currentStep: step.stepNumber },
    }),
  ]);

  return NextResponse.json({ queued: true, recipientId });
}
