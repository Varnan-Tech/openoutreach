import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignExists = await prisma.campaign.findUnique({ where: { id }, select: { id: true } });
  if (!campaignExists) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const body = await req.json();
  const csv = body.csv as string;
  if (!csv) return NextResponse.json({ error: 'csv string required in body' }, { status: 400 });

  let rows: Record<string, string>[];
  try {
    rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  } catch {
    return NextResponse.json({ error: 'Invalid CSV' }, { status: 400 });
  }
  if (!rows.length) return NextResponse.json({ error: 'No data rows' }, { status: 400 });

  let inserted = 0, skipped = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = (row.email ?? row.Email ?? '').trim().toLowerCase();
    if (!email) { skipped++; continue; }
    try {
      await prisma.recipient.upsert({
        where: { campaignId_email: { campaignId: id, email } },
        update: { data: row, rank: i },
        create: { campaignId: id, email, data: row, rank: i, stage: 'new' },
      });
      inserted++;
    } catch { skipped++; }
  }
  return NextResponse.json({ inserted, skipped });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipients = await prisma.recipient.findMany({
    where: { campaignId: id },
    orderBy: { rank: 'asc' },
    include: {
      scheduledSends: { select: { opens: true, lastOpenedAt: true, status: true } },
    },
  });
  return NextResponse.json(recipients.map(r => ({
    ...r,
    _opens: r.scheduledSends.reduce((sum, s) => sum + s.opens, 0),
    _lastOpenedAt: r.scheduledSends.reduce((latest: Date | null, s) =>
      s.lastOpenedAt && (!latest || s.lastOpenedAt > latest) ? s.lastOpenedAt : latest, null),
    scheduledSends: undefined,
  })));
}
