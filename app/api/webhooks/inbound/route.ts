import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Accepts inbound reply forwarded from ESP (Autosend inbound routing).
// Expected payload (flexible): { from: "email@domain.com", body?: "...", messageId?: "..." }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const fromEmail = (body.from ?? body.sender ?? body.email ?? '').toLowerCase().trim();

  if (!fromEmail) return NextResponse.json({ error: 'from email required' }, { status: 400 });

  const recipient = await prisma.recipient.findFirst({
    where: { email: fromEmail },
  });

  if (!recipient) return NextResponse.json({ handled: false, reason: 'recipient not found' });

  // Idempotent — if already replied, acknowledge without duplicate write
  if (recipient.stage === 'replied') return NextResponse.json({ handled: true, reason: 'already replied' });

  const [, , reply] = await prisma.$transaction([
    prisma.recipient.update({
      where: { id: recipient.id },
      data: { stage: 'replied' },
    }),
    prisma.scheduledSend.updateMany({
      where: { recipientId: recipient.id, status: 'pending' },
      data: { status: 'cancelled' },
    }),
    prisma.reply.create({
      data: {
        recipientId: recipient.id,
        messageIdReferenced: body.messageId ?? body.inReplyTo ?? null,
        body: body.body ?? body.text ?? body.plain ?? null,
        receivedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ handled: true, recipientId: recipient.id, replyId: reply.id });
}
