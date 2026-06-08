'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const STAGES = ['new', 'in_sequence', 'replied', 'bounced', 'completed'] as const;
type Stage = typeof STAGES[number];

const STAGE_COLOR: Record<Stage, string> = {
  new: '#4a6a4a',
  in_sequence: '#ffcc00',
  replied: '#4caf50',
  bounced: '#ef5350',
  completed: '#78909c',
};

const STAGE_LABEL: Record<Stage, string> = {
  new: 'NEW',
  in_sequence: 'IN SEQ',
  replied: 'REPLIED',
  bounced: 'BOUNCED',
  completed: 'DONE',
};

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'error'>('ok');
  const [launching, setLaunching] = useState(false);

  const reload = () => {
    fetch(`/api/campaigns/${id}`).then(r => r.json()).then(setCampaign);
    fetch(`/api/campaigns/${id}/recipients`).then(r => r.json()).then(setRecipients);
  };

  useEffect(() => { if (id) reload(); }, [id]);

  async function launch() {
    setLaunching(true);
    const res = await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setMsg(`LAUNCHED — ${data.launched} RECIPIENTS QUEUED`);
      setMsgType('ok');
      reload();
    } else {
      setMsg(data.error ?? data.lintErrors?.join(' · ') ?? 'LAUNCH FAILED');
      setMsgType('error');
    }
    setLaunching(false);
  }

  if (!campaign) return (
    <main style={{ fontFamily: "'JetBrains Mono', monospace" }} className="min-h-screen bg-[#0a0f0a] text-[#4a6a4a] flex items-center justify-center">
      <div className="text-sm tracking-[0.3em] uppercase">LOADING...</div>
    </main>
  );

  const counts: Record<string, number> = {};
  STAGES.forEach(s => { counts[s] = recipients.filter(r => r.stage === s).length; });

  return (
    <main style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }} className="min-h-screen bg-[#0a0f0a] text-[#c8e6c8] p-8">
      <div className="border-b border-[#2a3a2a] pb-6 mb-8">
        <a href="/" className="text-[#4a6a4a] text-xs tracking-[0.2em] uppercase hover:text-[#ffcc00] transition-colors">← DISPATCH BOARD</a>
        <div className="flex items-end justify-between mt-4">
          <div>
            <div className="text-[10px] text-[#4a6a4a] tracking-[0.3em] uppercase mb-1">{campaign.fromEmail}</div>
            <h1 className="text-2xl font-bold text-[#e8f5e8]">{campaign.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs tracking-[0.2em] uppercase px-3 py-1.5"
              style={{
                color: campaign.status === 'active' ? '#ffcc00' : '#4a6a4a',
                border: `1px solid ${campaign.status === 'active' ? '#ffcc00' : '#2a3a2a'}`,
              }}
            >
              {campaign.status}
            </span>
            {campaign.status === 'draft' && (
              <button
                onClick={launch}
                disabled={launching}
                className="border border-[#4caf50] text-[#4caf50] px-5 py-1.5 text-xs tracking-[0.2em] uppercase hover:bg-[#4caf50] hover:text-[#0a0f0a] transition-colors disabled:opacity-40"
              >
                {launching ? 'LAUNCHING...' : '▶ LAUNCH'}
              </button>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <div
          className="mb-6 px-4 py-3 text-xs tracking-[0.1em] border"
          style={{
            borderColor: msgType === 'ok' ? '#2e7d32' : '#c62828',
            color: msgType === 'ok' ? '#4caf50' : '#ef5350',
            background: msgType === 'ok' ? 'rgba(46,125,50,0.1)' : 'rgba(198,40,40,0.1)',
          }}
        >
          {msg}
        </div>
      )}

      <div className="grid grid-cols-5 gap-3 mb-8">
        {STAGES.map(s => (
          <div key={s} className="border border-[#1a2a1a] p-4">
            <div
              className="text-3xl font-bold tabular-nums mb-1"
              style={{ color: counts[s] > 0 ? STAGE_COLOR[s] : '#2a3a2a' }}
            >
              {counts[s] ?? 0}
            </div>
            <div className="text-[10px] text-[#4a6a4a] tracking-[0.2em]">{STAGE_LABEL[s]}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8 text-sm">
        <div className="border border-[#1a2a1a] p-4">
          <div className="text-[10px] text-[#4a6a4a] tracking-[0.2em] uppercase mb-2">SEND WINDOW</div>
          <div className="text-[#c8e6c8]">{campaign.sendWindowStart}:00 – {campaign.sendWindowEnd}:00</div>
          <div className="text-[#6a8a6a] text-xs mt-1">{campaign.sendWindowDays}</div>
        </div>
        <div className="border border-[#1a2a1a] p-4">
          <div className="text-[10px] text-[#4a6a4a] tracking-[0.2em] uppercase mb-2">DAILY CAP</div>
          <div className="text-[#c8e6c8] text-2xl font-bold tabular-nums">{campaign.dailyCap}</div>
          <div className="text-[#6a8a6a] text-xs mt-1">emails / day</div>
        </div>
        <div className="border border-[#1a2a1a] p-4">
          <div className="text-[10px] text-[#4a6a4a] tracking-[0.2em] uppercase mb-2">TIMEZONE</div>
          <div className="text-[#c8e6c8]">{campaign.tz}</div>
          <div className="text-[#6a8a6a] text-xs mt-1">{campaign.sequenceSteps?.length ?? 0} sequence steps</div>
        </div>
      </div>

      {recipients.length > 0 && (
        <>
          <div className="text-[10px] text-[#4a6a4a] tracking-[0.25em] uppercase mb-2">RECIPIENTS ({recipients.length})</div>
          <div className="border border-[#1a2a1a]">
            <div className="grid grid-cols-[1fr_100px_60px] text-[10px] text-[#4a6a4a] tracking-[0.2em] uppercase border-b border-[#1a2a1a] px-4 py-2">
              <span>EMAIL</span>
              <span>STAGE</span>
              <span>STEP</span>
            </div>
            {recipients.slice(0, 100).map(r => (
              <div key={r.id} className="grid grid-cols-[1fr_100px_60px] px-4 py-2 border-b border-[#0e140e] hover:bg-[#0e140e] text-sm transition-colors">
                <span className="text-[#c8e6c8] truncate">{r.email}</span>
                <span style={{ color: STAGE_COLOR[r.stage as Stage] ?? '#4a6a4a' }} className="text-xs uppercase tracking-wider">
                  {STAGE_LABEL[r.stage as Stage] ?? r.stage}
                </span>
                <span className="text-[#4a6a4a] tabular-nums">{r.currentStep ?? '—'}</span>
              </div>
            ))}
            {recipients.length > 100 && (
              <div className="px-4 py-2 text-[#4a6a4a] text-xs">+ {recipients.length - 100} more</div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
