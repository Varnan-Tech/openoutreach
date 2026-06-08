'use client';
import { useEffect, useState } from 'react';

const STATUS_SYMBOL: Record<string, string> = {
  draft: '○',
  active: '◉',
  paused: '◑',
  completed: '◎',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#666',
  active: '#ffcc00',
  paused: '#888',
  completed: '#4caf50',
};

export default function Home() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => { setCampaigns(data); setLoading(false); });
  }, []);

  return (
    <main style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }} className="min-h-screen bg-[#0a0f0a] text-[#c8e6c8] p-8">
      <div className="border-b border-[#2a3a2a] pb-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[#ffcc00] text-xs tracking-[0.3em] uppercase mb-2">OUTREACH DISPATCH</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#e8f5e8]">OpenOutreach</h1>
          </div>
          <a
            href="/campaigns/new"
            className="border border-[#ffcc00] text-[#ffcc00] px-5 py-2 text-xs tracking-[0.2em] uppercase hover:bg-[#ffcc00] hover:text-[#0a0f0a] transition-colors"
          >
            + NEW CAMPAIGN
          </a>
        </div>
      </div>

      {!loading && campaigns.length > 0 && (
        <div className="grid grid-cols-[1fr_200px_120px_80px_80px] gap-4 text-[10px] text-[#4a6a4a] tracking-[0.25em] uppercase mb-2 px-4">
          <span>CAMPAIGN</span>
          <span>SENDER</span>
          <span>RECIPIENTS</span>
          <span>CAP/DAY</span>
          <span>STATUS</span>
        </div>
      )}

      {loading ? (
        <div className="text-[#4a6a4a] text-sm py-8 tracking-[0.2em] uppercase">LOADING...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-[#2a4a2a] text-6xl mb-4">○</div>
          <div className="text-[#4a6a4a] text-sm tracking-[0.2em] uppercase">No campaigns yet</div>
        </div>
      ) : (
        <div className="space-y-1">
          {campaigns.map((c, i) => (
            <a
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="grid grid-cols-[1fr_200px_120px_80px_80px] gap-4 items-center px-4 py-3 border border-transparent hover:border-[#2a3a2a] hover:bg-[#0e140e] transition-all group"
            >
              <div className="text-[#e8f5e8] text-sm font-bold group-hover:text-[#ffcc00] transition-colors truncate">{c.name}</div>
              <div className="text-[#6a8a6a] text-xs truncate">{c.fromEmail}</div>
              <div className="text-[#c8e6c8] text-sm font-bold tabular-nums">{c._count.recipients}</div>
              <div className="text-[#6a8a6a] text-xs tabular-nums">{c.dailyCap}</div>
              <div className="flex items-center gap-2">
                <span style={{ color: STATUS_COLOR[c.status] ?? '#666' }}>{STATUS_SYMBOL[c.status] ?? '?'}</span>
                <span className="text-[#4a6a4a] text-xs uppercase">{c.status}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
