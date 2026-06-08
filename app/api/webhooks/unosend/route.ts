import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const evt = await req.json();
  const data = evt.data ?? evt;
  const msgId = data.messageId ?? data.message_id ?? data.id;

  const send = msgId
    ? await prisma.scheduledSend.findFirst({ where: { unosendMsgId: msgId }, include: { recipient: true } })
    : null;

  if (!send) return NextResponse.json({ message: 'Not tracked' });

  const event = (data.event ?? data.type ?? '').toLowerCase();

  if (event === 'bounced' || event === 'bounce') {
    await prisma.$transaction([
      prisma.recipient.update({ where: { id: send.recipientId }, data: { stage: 'bounced' } }),
      prisma.scheduledSend.updateMany({ where: { recipientId: send.recipientId, status: 'pending' }, data: { status: 'cancelled' } }),
    ]);
  }

  if (event === 'replied' || event === 'reply') {
    await prisma.$transaction([
      prisma.recipient.update({ where: { id: send.recipientId }, data: { stage: 'replied' } }),
      prisma.scheduledSend.updateMany({ where: { recipientId: send.recipientId, status: 'pending' }, data: { status: 'cancelled' } }),
      prisma.reply.create({
        data: {
          recipientId: send.recipientId,
          messageIdReferenced: msgId ?? null,
          body: data.body ?? data.text ?? null,
          receivedAt: new Date(),
        },
      }),
    ]);
  }

  if (event === 'opened' || event === 'open') {
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
