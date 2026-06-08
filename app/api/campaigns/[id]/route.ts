import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { sequenceSteps: { orderBy: { stepNumber: 'asc' } }, _count: { select: { recipients: true } } },
  });
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const campaign = await prisma.campaign.update({ where: { id: params.id }, data: body });
  return NextResponse.json(campaign);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
