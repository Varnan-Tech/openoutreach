import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const d = body.data ?? body;
  // Autosend uses emailId, not messageId
  const msgId = d.emailId ?? d.email_id ?? d.messageId ?? body.emailId ?? null;

  const send = msgId
    ? await prisma.scheduledSend.findFirst({ where: { unosendMsgId: msgId }, include: { recipient: true } })
    : null;

  if (!send) return NextResponse.json({ message: 'Not tracked' });

  const event = (body.event ?? body.type ?? d.event ?? d.type ?? '').toLowerCase();

  if (event.includes('bounce')) {
    await prisma.$transaction([
      prisma.recipient.update({ where: { id: send.recipientId }, data: { stage: 'bounced' } }),
      prisma.scheduledSend.updateMany({ where: { recipientId: send.recipientId, status: 'pending' }, data: { status: 'cancelled' } }),
    ]);
  }

  if (event.includes('repl')) {
    await prisma.$transaction([
      prisma.recipient.update({ where: { id: send.recipientId }, data: { stage: 'replied' } }),
      prisma.scheduledSend.updateMany({ where: { recipientId: send.recipientId, status: 'pending' }, data: { status: 'cancelled' } }),
      prisma.reply.create({
        data: {
          recipientId: send.recipientId,
          messageIdReferenced: msgId ?? null,
          body: d.body ?? d.text ?? null,
          receivedAt: new Date(),
        },
      }),
    ]);
  }

  if (event.includes('open')) {
    await prisma.scheduledSend.update({
      where: { id: send.id },
      data: { opens: { increment: 1 }, lastOpenedAt: new Date() },
    });
    const r = send.recipient;
    if (r.stage !== 'replied' && r.stage !== 'bounced') {
      await prisma.recipient.update({ where: { id: r.id }, data: { stage: 'in_sequence' } });
    }
  }

  return NextResponse.json({ handled: event });
}
