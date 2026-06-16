'use client';
import { useEffect, useState } from 'react';

const STATUS: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:     { label: 'Draft',     dot: '#64748B', text: 'rgba(232,234,240,0.4)',  bg: 'rgba(100,116,139,0.08)' },
  active:    { label: 'Active',    dot: '#10B981', text: '#10B981',               bg: 'rgba(16,185,129,0.1)'  },
  paused:    { label: 'Paused',    dot: '#F59E0B', text: '#F59E0B',               bg: 'rgba(245,158,11,0.1)'  },
  completed: { label: 'Completed', dot: '#8B5CF6', text: '#8B5CF6',               bg: 'rgba(139,92,246,0.1)'  },
};

function SkeletonRow() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '40%' }} />
        <div className="skeleton" style={{ height: 10, width: '25%' }} />
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <div className="skeleton" style={{ height: 32, width: 52 }} />
        <div className="skeleton" style={{ height: 32, width: 52 }} />
      </div>
      <div className="skeleton" style={{ height: 22, width: 70, borderRadius: 6 }} />
    </div>
  );
}

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
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6,
              fontFamily: 'var(--font-mono)',
            }}>
              Campaigns
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 400, color: 'var(--text)', margin: 0,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
            }}>
              Your outreach campaigns
            </h1>
          </div>
          <a
            href="/campaigns/new"
            style={{
              background: 'var(--accent)', color: '#fff', padding: '9px 18px',
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', fontFamily: 'var(--font-ui)',
              transition: 'opacity 0.15s, transform 0.15s',
              display: 'inline-block',
            }}
            onMouseOver={e => {
              e.currentTarget.style.opacity = '0.88';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            + New campaign
          </a>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '72px 24px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 300,
              color: 'var(--dim)', lineHeight: 1, marginBottom: 20,
              letterSpacing: '-0.02em',
            }}>
              No campaigns yet
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
              Create your first campaign to start sending cold emails.
            </p>
            <a href="/campaigns/new" style={{
              background: 'var(--accent)', color: '#fff', padding: '9px 20px',
              borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              display: 'inline-block',
            }}>
              Create campaign
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {campaigns.map(c => {
              const s = STATUS[c.status] ?? STATUS.draft;
              return (
                <a
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid transparent',
                    borderRadius: 10, padding: '16px 20px',
                    textDecoration: 'none', display: 'flex',
                    alignItems: 'center', gap: 16,
                    transition: 'border-left-color 0.15s, background 0.15s',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderLeftColor = 'var(--accent)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderLeftColor = 'transparent';
                    e.currentTarget.style.background = 'var(--surface)';
                  }}
                >
                  {/* Name + sender */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
                      color: 'var(--text)', marginBottom: 3, letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {c.fromEmail}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'flex', gap: 28, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {c._count?.recipients ?? 0}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        Recipients
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 400, color: 'var(--muted)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {c.dailyCap}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        Daily cap
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6, flexShrink: 0,
                    background: s.bg, fontSize: 11, fontWeight: 600, color: s.text,
                    fontFamily: 'var(--font-ui)',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
                    {s.label}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
