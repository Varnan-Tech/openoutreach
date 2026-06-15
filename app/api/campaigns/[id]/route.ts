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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  const valid = ['active', 'paused', 'completed'];
  if (!valid.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  try {
    const existing = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status === 'completed') return NextResponse.json({ error: 'Cannot modify completed campaign' }, { status: 400 });
    const campaign = await prisma.campaign.update({ where: { id }, data: { status } });
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
