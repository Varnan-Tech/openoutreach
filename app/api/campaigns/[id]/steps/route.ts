import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const steps = await prisma.sequenceStep.findMany({
    where: { campaignId: id }, orderBy: { stepNumber: 'asc' },
  });
  return NextResponse.json(steps);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { stepNumber, delayDaysFromPrevious = 0, subjectTemplate, bodyHtmlTemplate, bodyTextTemplate } = body;
  const step = await prisma.sequenceStep.create({
    data: { campaignId: id, stepNumber, delayDaysFromPrevious, subjectTemplate, bodyHtmlTemplate, bodyTextTemplate },
  });
  return NextResponse.json(step, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const body = await req.json();
  const { id, ...updates } = body;
  const step = await prisma.sequenceStep.update({ where: { id }, data: updates });
  return NextResponse.json(step);
}
