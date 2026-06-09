import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
);

// UA patterns that indicate ESP prefetch scanners or bots
const BOT_UA_RE = /bot|crawler|spider|preview|HeadlessChrome/i;

function servePixel() {
  return new NextResponse(PIXEL, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
  });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return servePixel();

  // Filter 1: UA — bots and ESP prefetch scanners
  const ua = req.headers.get('user-agent') ?? '';
  if (BOT_UA_RE.test(ua) || /^Mozilla\/5\.0\s*$/.test(ua)) return servePixel();

  // Fetch send with recipient for timing check and stage update
  const send = await prisma.scheduledSend.findUnique({
    where: { id },
    select: {
      id: true, status: true, sentAt: true, recipientId: true,
      recipient: { select: { stage: true } },
    },
  });
  if (!send || send.status !== 'sent') return servePixel();

  // Filter 2: Timing — opens within 10s of sentAt are ESP bot scans
  if (send.sentAt && Date.now() - send.sentAt.getTime() < 10_000) return servePixel();

  // Real human open — increment and advance stage
  const protectedStages = ['replied', 'bounced', 'unsubscribed', 'completed'];
  const shouldAdvanceStage = !protectedStages.includes(send.recipient.stage);

  if (shouldAdvanceStage) {
    await prisma.$transaction([
      prisma.scheduledSend.update({
        where: { id },
        data: { opens: { increment: 1 }, lastOpenedAt: new Date() },
      }),
      prisma.recipient.update({
        where: { id: send.recipientId },
        data: { stage: 'opened' },
      }),
    ]);
  } else {
    await prisma.scheduledSend.update({
      where: { id },
      data: { opens: { increment: 1 }, lastOpenedAt: new Date() },
    });
  }

  return servePixel();
}
