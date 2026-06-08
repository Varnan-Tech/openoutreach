import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { sequenceSteps: { orderBy: { stepNumber: 'asc' } }, _count: { select: { recipients: true } } },
  });
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, fromEmail, fromName, fromDomain, sendWindowStart, sendWindowEnd, sendWindowDays, tz, dailyCap } = await req.json();
  try {
    const campaign = await prisma.campaign.update({
      where: { id },
      data: { name, fromEmail, fromName, fromDomain, sendWindowStart, sendWindowEnd, sendWindowDays, tz, dailyCap },
    });
    return NextResponse.json(campaign);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
