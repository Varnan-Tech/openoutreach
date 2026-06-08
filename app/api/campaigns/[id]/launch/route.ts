import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { lintTemplate } from '@/lib/template';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { sequenceSteps: { orderBy: { stepNumber: 'asc' } } },
  });
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!campaign.sequenceSteps.length) return NextResponse.json({ error: 'No sequence steps' }, { status: 400 });

  const newRecipients = await prisma.recipient.findMany({
    where: { campaignId: id, stage: 'new' },
    orderBy: { rank: 'asc' },
  });
  if (!newRecipients.length) return NextResponse.json({ error: 'No new recipients to launch' }, { status: 400 });

  // lint ALL steps — broken tokens in step 2+ would silently pass and crash at send time
  const sampleData = newRecipients[0].data as Record<string, unknown>;
  const csvHeaders = Object.keys(sampleData);
  const step0 = campaign.sequenceSteps[0];
  const lintErrors = campaign.sequenceSteps.flatMap(step => [
    ...lintTemplate(step.subjectTemplate, csvHeaders),
    ...lintTemplate(step.bodyTextTemplate, csvHeaders),
  ]);
  if (lintErrors.length) return NextResponse.json({ error: 'Lint failed', lintErrors }, { status: 422 });

  // schedule step 1 for all new recipients in two bulk writes (not N sequential writes)
  const now = new Date();
  await prisma.scheduledSend.createMany({
    data: newRecipients.map(r => ({
      recipientId: r.id, stepId: step0.id, scheduledAt: now, status: 'pending',
    })),
  });
  await prisma.recipient.updateMany({
    where: { campaignId: id, stage: 'new' },
    data: { stage: 'in_sequence', currentStep: step0.stepNumber },
  });
  await prisma.campaign.update({ where: { id }, data: { status: 'active' } });
  return NextResponse.json({ launched: newRecipients.length });
}
