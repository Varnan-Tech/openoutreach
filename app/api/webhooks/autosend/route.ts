import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const d = body.data ?? body;
  const msgId = d.emailId ?? d.email_id ?? d.messageId ?? body.emailId ?? null;

  // Primary lookup: by messageId stored at send time
  let send = msgId
    ? await prisma.scheduledSend.findFirst({
        where: { unosendMsgId: msgId },
        include: { recipient: true },
      })
    : null;

  // Fallback lookup: by recipient email — Autosend may omit messageId on some event types
  if (!send) {
    const recipientEmail = (d.email ?? d.to ?? d.recipient ?? body.email ?? '').toLowerCase().trim();
    if (recipientEmail) {
      const recipient = await prisma.recipient.findFirst({ where: { email: recipientEmail } });
      if (recipient) {
        send = await prisma.scheduledSend.findFirst({
          where: { recipientId: recipient.id, status: 'sent' },
          include: { recipient: true },
          orderBy: { sentAt: 'desc' },
        }) ?? null;
      }
    }
  }

  if (!send) return NextResponse.json({ handled: false, reason: 'not tracked' });

  const event = (body.event ?? body.type ?? d.event ?? d.type ?? '').toLowerCase();

  if (event.includes('bounce')) {
    await prisma.$transaction([
      prisma.recipient.update({ where: { id: send.recipientId }, data: { stage: 'bounced' } }),
      prisma.scheduledSend.updateMany({
        where: { recipientId: send.recipientId, status: 'pending' },
        data: { status: 'cancelled' },
      }),
    ]);
  }

  if (event.includes('repl')) {
    await prisma.$transaction([
      prisma.recipient.update({ where: { id: send.recipientId }, data: { stage: 'replied' } }),
      prisma.scheduledSend.updateMany({
        where: { recipientId: send.recipientId, status: 'pending' },
        data: { status: 'cancelled' },
      }),
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
    const protectedStages = ['replied', 'bounced', 'unsubscribed', 'completed'];
    if (!protectedStages.includes(send.recipient.stage)) {
      await prisma.recipient.update({ where: { id: send.recipient.id }, data: { stage: 'opened' } });
    }
  }

  return NextResponse.json({ handled: event });
}
