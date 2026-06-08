import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
);

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    await prisma.scheduledSend.update({
      where: { id },
      data: { opens: { increment: 1 }, lastOpenedAt: new Date() },
    }).catch(() => {});
  }
  return new NextResponse(PIXEL, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
  });
}
