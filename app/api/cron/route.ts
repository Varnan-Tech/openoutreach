import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendUnosend } from '@/lib/unosend';
import { renderTemplate } from '@/lib/template';
import { isWithinWindow } from '@/lib/window';

export async function GET() {
  // Fetch a batch so we can skip campaigns outside their send window.
  // With N campaigns, the globally-oldest send may belong to a campaign
  // that is paused or outside its window — scanning 20 candidates ensures
  // another campaign's valid send still gets processed this tick.
  const candidates = await prisma.scheduledSend.findMany({
    where: { status: 'pending', scheduledAt: { lte: new Date() } },
    include: { recipient: { include: { campaign: true } }, step: true },
    orderBy: { scheduledAt: 'asc' },
    take: 20,
  });

  if (!candidates.length) return NextResponse.json({ message: 'No pending sends' });

  // daily cap cache to avoid per-candidate DB hits
  // Use UTC midnight as day boundary — consistent regardless of server locale.
  // Campaigns in IST will see cap reset at 5:30am IST (= 00:00 UTC), which is acceptable.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const capCache: Record<string, number> = {};

  let send = null;
  for (const c of candidates) {
    const { campaign } = c.recipient;
    if (campaign.status !== 'active') continue;
    if (!isWithinWindow(campaign)) continue;
    if (!(campaign.id in capCache)) {
      capCache[campaign.id] = await prisma.scheduledSend.count({
        where: { recipient: { campaignId: campaign.id }, status: 'sent', updatedAt: { gte: startOfDay } },
      });
    }
    if (capCache[campaign.id] >= campaign.dailyCap) continue;
    send = c;
    break;
  }

  if (!send) return NextResponse.json({ message: 'No eligible sends (paused / outside window / cap hit)' });

  // Atomically claim the send — prevents double-fire from concurrent cron invocations
  const claimed = await prisma.scheduledSend.updateMany({
    where: { id: send.id, status: 'pending' },
    data: { status: 'sending' },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ message: 'Send already claimed by another instance' });
  }

  const { campaign } = send.recipient;
  const recipientData = send.recipient.data as Record<string, unknown>;
  const subject = renderTemplate(send.step.subjectTemplate, recipientData);
  const html = renderTemplate(send.step.bodyHtmlTemplate, recipientData);
  const text = renderTemplate(send.step.bodyTextTemplate, recipientData);

  // tracking pixel
  const publicUrl = process.env.PUBLIC_URL ?? 'http://localhost:3000';
  const htmlWithPixel = html + `<img src="${publicUrl}/api/track?id=${send.id}" width="1" height="1" style="display:block;width:1px;height:1px;border:0" />`;

  let result: { messageId: string | null; raw: unknown };
  try {
    result = await sendUnosend({
      to: send.recipient.email, from: campaign.fromEmail,
      fromName: campaign.fromName, subject, html: htmlWithPixel, text,
      unosendApiKey: campaign.unosendApiKey,
    });
  } catch (e: unknown) {
    await prisma.scheduledSend.update({
      where: { id: send.id },
      data: { status: 'failed', error: (e as Error).message },
    });
    return NextResponse.json({ message: 'Send failed', error: (e as Error).message });
  }

  await prisma.scheduledSend.update({
    where: { id: send.id },
    data: { status: 'sent', unosendMsgId: result.messageId },
  });

  // queue next step if exists
  const nextStep = await prisma.sequenceStep.findUnique({
    where: { campaignId_stepNumber: { campaignId: campaign.id, stepNumber: send.step.stepNumber + 1 } },
  });
  if (nextStep) {
    const delayMs = nextStep.delayDaysFromPrevious * 86400 * 1000;
    await prisma.scheduledSend.create({
      data: {
        recipientId: send.recipientId,
        stepId: nextStep.id,
        scheduledAt: new Date(Date.now() + delayMs),
        status: 'pending',
      },
    });
    await prisma.recipient.update({
      where: { id: send.recipientId },
      data: { stage: 'in_sequence', currentStep: send.step.stepNumber + 1 },
    });
  } else {
    await prisma.recipient.update({
      where: { id: send.recipientId },
      data: { stage: 'completed', currentStep: send.step.stepNumber },
    });
  }

  return NextResponse.json({ message: 'Sent', to: send.recipient.email, step: send.step.stepNumber });
}
