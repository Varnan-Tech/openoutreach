'use client';
import { useEffect, useState } from 'react';

const STATUS: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:     { label: 'Draft',     dot: '#64748B', text: 'rgba(232,234,240,0.5)',  bg: 'rgba(100,116,139,0.1)' },
  active:    { label: 'Active',    dot: '#10B981', text: '#10B981',               bg: 'rgba(16,185,129,0.1)'  },
  paused:    { label: 'Paused',    dot: '#F59E0B', text: '#F59E0B',               bg: 'rgba(245,158,11,0.1)'  },
  completed: { label: 'Completed', dot: '#8B5CF6', text: '#8B5CF6',               bg: 'rgba(139,92,246,0.1)'  },
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
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 52px)', padding: '36px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              color: 'var(--indigo)', textTransform: 'uppercase', marginBottom: 6,
              fontFamily: 'var(--font-mono)',
            }}>
              Campaigns
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 400, color: 'var(--text)', margin: 0,
              fontFamily: 'var(--font-display)', letterSpacing: '0.01em',
            }}>
              Your outreach campaigns
            </h1>
          </div>
          <a
            href="/campaigns/new"
            style={{
              background: 'var(--indigo)', color: '#fff', padding: '9px 18px',
              borderRadius: 9, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', fontFamily: 'var(--font-ui)',
              boxShadow: '0 0 14px rgba(99,102,241,0.25)',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            + New Campaign
          </a>
        </div>

        {/* Card grid */}
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 14 }}>
            Loading…
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '80px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.4 }}>📭</div>
            <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: 16, margin: '0 0 6px' }}>
              No campaigns yet
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 22px' }}>
              Create your first campaign to start sending
            </p>
            <a href="/campaigns/new" style={{
              background: 'var(--indigo)', color: '#fff', padding: '9px 18px',
              borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              Create campaign
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {campaigns.map(c => {
              const s = STATUS[c.status] ?? STATUS.draft;
              return (
                <a
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '20px 22px',
                    textDecoration: 'none', display: 'block',
                    transition: 'border-color 0.15s, transform 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Name */}
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 400,
                    color: 'var(--text)', marginBottom: 4, letterSpacing: '0.01em',
                  }}>
                    {c.name}
                  </div>
                  {/* Sender */}
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
                    {c.fromEmail}
                  </div>
                  {/* Metrics row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {c._count?.recipients ?? 0}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
                          Recipients
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 400, color: 'var(--muted)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {c.dailyCap}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
                          Daily cap
                        </div>
                      </div>
                    </div>
                    {/* Status badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 6,
                      background: s.bg, fontSize: 11, fontWeight: 600, color: s.text,
                      fontFamily: 'var(--font-ui)',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
                      {s.label}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
