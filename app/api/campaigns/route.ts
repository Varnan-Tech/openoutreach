import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { recipients: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, fromEmail, fromName, fromDomain, unosendApiKey,
          sendWindowStart = 19, sendWindowEnd = 23,
          sendWindowDays = 'Mon,Tue,Wed,Thu,Fri,Sat',
          tz = 'Asia/Kolkata', dailyCap = 10 } = body as {
    name?: string; fromEmail?: string; fromName?: string; fromDomain?: string;
    unosendApiKey?: string; sendWindowStart?: number; sendWindowEnd?: number;
    sendWindowDays?: string; tz?: string; dailyCap?: number;
  };
  const cleanEmail = (fromEmail ?? '').trim();
  if (!name || !cleanEmail) {
    return NextResponse.json({ error: 'name and fromEmail required' }, { status: 400 });
  }
  const campaign = await prisma.campaign.create({
    data: { name, fromEmail: cleanEmail, fromName: fromName ?? '', fromDomain: fromDomain ?? cleanEmail.split('@')[1] ?? '',
            unosendApiKey: unosendApiKey ?? '', sendWindowStart, sendWindowEnd, sendWindowDays, tz, dailyCap },
  });
  return NextResponse.json(campaign, { status: 201 });
}
