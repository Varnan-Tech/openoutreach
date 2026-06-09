'use client';
import { useEffect, useState } from 'react';

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: '#475569', bg: '#F1F5F9' },
  active:    { label: 'Active',    color: '#1D4ED8', bg: '#EFF6FF' },
  paused:    { label: 'Paused',    color: '#B45309', bg: '#FFFBEB' },
  completed: { label: 'Completed', color: '#047857', bg: '#ECFDF5' },
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
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-indigo-500 tracking-widest uppercase mb-1">Outreach Platform</p>
            <h1 className="text-3xl font-bold text-slate-900">OpenOutreach</h1>
          </div>
          <a
            href="/campaigns/new"
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + New Campaign
          </a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-sm">Loading…</div>
          ) : campaigns.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-slate-600 font-semibold text-lg">No campaigns yet</p>
              <p className="text-slate-400 text-sm mt-1">Create your first campaign to start sending</p>
              <a href="/campaigns/new" className="inline-block mt-5 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Create campaign
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[2fr_1.2fr_90px_80px_100px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Campaign</span>
                <span>Sender</span>
                <span>Recipients</span>
                <span>Daily cap</span>
                <span>Status</span>
              </div>
              {campaigns.map(c => {
                const s = STATUS[c.status] ?? STATUS.draft;
                return (
                  <a
                    key={c.id}
                    href={`/campaigns/${c.id}`}
                    className="grid grid-cols-[2fr_1.2fr_90px_80px_100px] gap-4 items-center px-6 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group"
                  >
                    <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{c.name}</span>
                    <span className="text-slate-500 text-sm truncate">{c.fromEmail}</span>
                    <span className="text-slate-700 font-semibold tabular-nums text-sm">{c._count?.recipients ?? 0}</span>
                    <span className="text-slate-500 tabular-nums text-sm">{c.dailyCap}</span>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: s.color, background: s.bg }}
                    >
                      {s.label}
                    </span>
                  </a>
                );
              })}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
