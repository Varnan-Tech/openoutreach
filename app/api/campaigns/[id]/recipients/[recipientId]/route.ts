import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { id, recipientId } = await params;
  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, campaignId: id },
    include: {
      scheduledSends: {
        include: { step: { select: { stepNumber: true, subjectTemplate: true } } },
        orderBy: { scheduledAt: 'asc' },
      },
      replies: { orderBy: { receivedAt: 'asc' } },
    },
  });
  if (!recipient) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(recipient);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { id, recipientId } = await params;
  const { stage } = await req.json();
  const valid = ['new','in_sequence','opened','replied','bounced','unsubscribed','completed']; // 'queued' excluded — system-managed by cron/sequencer; manual stage changes skip it
  if (!valid.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
  try {
    const recipient = await prisma.recipient.update({
      where: { id: recipientId, campaignId: id },
      data: { stage },
    });
    return NextResponse.json(recipient);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
