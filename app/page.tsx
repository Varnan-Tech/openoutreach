'use client';
import { useEffect, useState } from 'react';

const STATUS: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:     { label: 'Draft',     dot: '#a1a1a1', text: '#888888',  bg: 'rgba(0,0,0,0.04)' },
  active:    { label: 'Active',    dot: '#10B981', text: '#10B981',  bg: 'rgba(16,185,129,0.08)'  },
  paused:    { label: 'Paused',    dot: '#F59E0B', text: '#F59E0B',  bg: 'rgba(245,158,11,0.08)'  },
  completed: { label: 'Completed', dot: '#8B5CF6', text: '#8B5CF6',  bg: 'rgba(139,92,246,0.08)'  },
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
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 52px)', padding: '36px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
              color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8,
              fontFamily: 'var(--font-mono)',
            }}>
              Campaigns
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: 0,
              fontFamily: 'var(--font-ui)', letterSpacing: '-0.04em', lineHeight: 1.1,
            }}>
              Your outreach campaigns.
            </h1>
          </div>
          <a
            href="/campaigns/new"
            style={{
              background: 'var(--accent)', color: 'var(--on-accent)', padding: '8px 18px',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              textDecoration: 'none', fontFamily: 'var(--font-ui)',
              transition: 'opacity 0.15s, transform 0.15s',
              display: 'inline-block',
            }}
            onMouseOver={e => {
              e.currentTarget.style.opacity = '0.8';
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
              fontFamily: 'var(--font-ui)', fontSize: 24, fontWeight: 600,
              color: 'var(--text)', lineHeight: 1.2, marginBottom: 12,
              letterSpacing: '-0.03em',
            }}>
              No campaigns yet
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
              Create your first campaign to start sending cold emails.
            </p>
            <a href="/campaigns/new" style={{
              background: 'var(--accent)', color: 'var(--on-accent)', padding: '8px 20px',
              borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              display: 'inline-block',
            }}>
              Create campaign
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                    borderRadius: 8, padding: '14px 18px',
                    textDecoration: 'none', display: 'flex',
                    alignItems: 'center', gap: 16,
                    transition: 'border-left-color 0.15s, background 0.15s',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderLeftColor = 'var(--accent)';
                    e.currentTarget.style.background = 'var(--surface-2)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderLeftColor = 'transparent';
                    e.currentTarget.style.background = 'var(--surface)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
                      color: 'var(--text)', marginBottom: 2, letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {c.fromEmail}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {c._count?.recipients ?? 0}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        Recipients
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 400, color: 'var(--muted)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {c.dailyCap}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        Daily cap
                      </div>
                    </div>
                  </div>

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 9px', borderRadius: 6, flexShrink: 0,
                    background: s.bg, fontSize: 11, fontWeight: 500, color: s.text,
                    fontFamily: 'var(--font-ui)',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
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
