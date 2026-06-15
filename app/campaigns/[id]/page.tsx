'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

const KANBAN_STAGES = [
  { id: 'new',          label: 'New',         color: '#64748B' },
  { id: 'in_sequence',  label: 'In Sequence', color: '#6366F1' },
  { id: 'opened',       label: 'Opened',      color: '#F59E0B' },
  { id: 'replied',      label: 'Replied',     color: '#10B981' },
  { id: 'bounced',      label: 'Bounced',     color: '#FB7185' },
  { id: 'unsubscribed', label: 'Unsub',       color: '#475569' },
  { id: 'completed',    label: 'Done',        color: '#8B5CF6' },
] as const;

const STATUS_CFG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:     { label: 'Draft',     dot: '#64748B', text: 'rgba(232,234,240,0.5)', bg: 'rgba(100,116,139,0.08)' },
  active:    { label: 'Active',    dot: '#10B981', text: '#10B981',              bg: 'rgba(16,185,129,0.1)'   },
  paused:    { label: 'Paused',    dot: '#F59E0B', text: '#F59E0B',              bg: 'rgba(245,158,11,0.1)'   },
  completed: { label: 'Completed', dot: '#8B5CF6', text: '#8B5CF6',              bg: 'rgba(139,92,246,0.1)'   },
};

type StepDraft = { subject: string; bodyText: string; delayDays: number };

const iStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--border-2)', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, color: 'var(--text)',
  background: 'var(--surface-2)', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

export default function CampaignPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'error'>('ok');
  const [launching, setLaunching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [draft, setDraft] = useState<StepDraft>({ subject: '', bodyText: '', delayDays: 0 });
  const [addingStep, setAddingStep] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    fetch(`/api/campaigns/${id}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setCampaign(d); });
    fetch(`/api/campaigns/${id}/recipients`).then(r => r.ok ? r.json() : []).then(setRecipients);
    fetch(`/api/campaigns/${id}/steps`).then(r => r.ok ? r.json() : []).then(setSteps);
  }, [id]);

  useEffect(() => { if (id) reload(); }, [id, reload]);

  function flash(text: string, type: 'ok' | 'error') {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  }

  async function launch() {
    setLaunching(true);
    const res = await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) { flash(`Launched — ${data.launched} recipients queued`, 'ok'); reload(); }
    else { flash(data.error ?? data.lintErrors?.join(' · ') ?? 'Launch failed', 'error'); }
    setLaunching(false);
  }

  async function sendNow(recipientId: string) {
    setSending(recipientId);
    const res = await fetch(`/api/campaigns/${id}/send-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId }),
    });
    const data = await res.json();
    if (res.ok) { flash('Queued for immediate send', 'ok'); reload(); }
    else { flash(data.error ?? 'Send failed', 'error'); }
    setSending(null);
  }

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    setAddingStep(true);
    const stepNumber = (steps[steps.length - 1]?.stepNumber ?? 0) + 1;
    const html = draft.bodyText.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    const res = await fetch(`/api/campaigns/${id}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stepNumber, delayDaysFromPrevious: draft.delayDays,
        subjectTemplate: draft.subject, bodyHtmlTemplate: html, bodyTextTemplate: draft.bodyText,
      }),
    });
    if (res.ok) { setDraft({ subject: '', bodyText: '', delayDays: 0 }); setShowAddStep(false); reload(); }
    else flash('Failed to add step', 'error');
    setAddingStep(false);
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Delete this step?')) return;
    const res = await fetch(`/api/campaigns/${id}/steps?stepId=${stepId}`, { method: 'DELETE' });
    if (res.ok) reload(); else flash('Failed to delete step', 'error');
  }

  async function uploadCSV(file: File) {
    setUploading(true);
    const text = await file.text();
    const res = await fetch(`/api/campaigns/${id}/recipients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    if (res.ok) { flash(`${data.inserted} recipients added, ${data.skipped} skipped`, 'ok'); reload(); }
    else flash(data.error ?? 'Upload failed', 'error');
    setUploading(false);
  }

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const counts: Record<string, number> = {};
  KANBAN_STAGES.forEach(s => { counts[s.id] = recipients.filter(r => r.stage === s.id).length; });
  const totalSent = (counts.in_sequence || 0) + (counts.opened || 0) + (counts.replied || 0) + (counts.bounced || 0) + (counts.completed || 0);
  const openRate  = totalSent > 0 ? (((counts.opened || 0) + (counts.replied || 0)) / totalSent * 100).toFixed(1) : '—';
  const replyRate = totalSent > 0 ? ((counts.replied || 0) / totalSent * 100).toFixed(1) : '—';
  const sc = STATUS_CFG[campaign?.status] ?? STATUS_CFG.draft;

  const STATS = [
    { label: 'Total',   value: String(recipients.length),       color: 'var(--text)' },
    { label: 'In Seq',  value: String(counts.in_sequence || 0), color: '#6366F1'     },
    { label: 'Opened',  value: String(counts.opened || 0),      color: '#F59E0B'     },
    { label: 'Open %',  value: openRate === '—' ? '—' : `${openRate}%`,  color: '#F59E0B' },
    { label: 'Replied', value: String(counts.replied || 0),     color: '#10B981'     },
    { label: 'Reply %', value: replyRate === '—' ? '—' : `${replyRate}%`, color: '#10B981' },
    { label: 'Bounced', value: String(counts.bounced || 0),     color: '#FB7185'     },
  ];

  if (!campaign) return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 52px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--dim)', fontSize: 13, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>loading···</span>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes kanban-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .oo-kanban-col { animation: kanban-in 0.25s ease both; }
        .oo-stat-glow  { transition: opacity 0.15s; }
        .oo-stat-glow:hover { opacity: 0.8; }
      `}</style>

      <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 52px)', fontFamily: 'var(--font-ui)' }}>

        {/* ── Campaign sub-header ─────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 28px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          height: 52,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/" style={{ fontSize: 11, color: 'var(--dim)', textDecoration: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>← campaigns</a>
            <span style={{ color: 'var(--border-2)', fontSize: 16, lineHeight: 1 }}>·</span>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 400,
              color: 'var(--text)', margin: 0, letterSpacing: '0.01em',
            }}>
              {campaign.name}
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 5,
              background: sc.bg, fontSize: 10, fontWeight: 700,
              color: sc.text, letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: sc.dot,
                boxShadow: `0 0 5px ${sc.dot}`,
              }} />
              {sc.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>{campaign.fromEmail}</span>
            {campaign.status === 'draft' && (
              <button
                onClick={launch} disabled={launching}
                style={{
                  background: launching ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)',
                  color: '#10B981',
                  border: '1px solid rgba(16,185,129,0.25)',
                  padding: '6px 14px', borderRadius: 6,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
                  cursor: launching ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: launching ? 'none' : '0 0 12px rgba(16,185,129,0.15)',
                }}
              >
                {launching ? '···' : '▶ Launch'}
              </button>
            )}
          </div>
        </div>

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 28px',
          display: 'flex',
          overflowX: 'auto',
        }}>
          {STATS.map(({ label, value, color }, i) => (
            <div
              key={label}
              className="oo-stat-glow"
              style={{
                padding: '14px 28px 14px 0',
                marginRight: 28,
                borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none',
                flexShrink: 0,
              }}
            >
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                fontWeight: 300,
                color,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                textShadow: color !== 'var(--text)' ? `0 0 18px ${color}55` : 'none',
              }}>
                {value}
              </div>
              <div style={{
                fontSize: 9,
                color: 'var(--dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 5,
                fontFamily: 'var(--font-mono)',
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Flash ──────────────────────────────────────────────────────── */}
        {msg && (
          <div style={{
            margin: '12px 28px 0', padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: msgType === 'ok' ? 'var(--emerald-pale)' : 'var(--coral-pale)',
            color: msgType === 'ok' ? 'var(--emerald)' : 'var(--coral)',
            border: `1px solid ${msgType === 'ok' ? 'rgba(16,185,129,0.2)' : 'rgba(251,113,133,0.2)'}`,
          }}>
            {msg}
          </div>
        )}

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div style={{ padding: '24px 28px 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Kanban board ───────────────────────────────────────────── */}
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--dim)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              marginBottom: 14, fontFamily: 'var(--font-mono)',
            }}>
              Recipients by Stage
            </div>
            <div style={{
              display: 'flex', gap: 10,
              overflowX: 'auto',
              paddingBottom: 12,
              paddingRight: 2,
            }}>
              {KANBAN_STAGES.map((stage, idx) => {
                const stageRecipients = recipients.filter(r => r.stage === stage.id);
                return (
                  <div
                    key={stage.id}
                    className="oo-kanban-col"
                    style={{
                      minWidth: 220, maxWidth: 220, flexShrink: 0,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12, overflow: 'hidden',
                      borderTop: `2px solid ${stage.color}`,
                      animationDelay: `${idx * 45}ms`,
                    }}
                  >
                    {/* Column header */}
                    <div style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 7,
                      background: `linear-gradient(180deg, ${stage.color}0A 0%, transparent 100%)`,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: stage.color, flexShrink: 0,
                        boxShadow: `0 0 7px ${stage.color}90`,
                      }} />
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: 'var(--muted)',
                        textTransform: 'uppercase', letterSpacing: '0.09em',
                        flex: 1, fontFamily: 'var(--font-mono)',
                      }}>
                        {stage.label}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: stageRecipients.length > 0 ? stage.color : 'var(--dim)',
                        background: stageRecipients.length > 0 ? `${stage.color}18` : 'rgba(255,255,255,0.04)',
                        padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                        transition: 'all 0.2s',
                      }}>
                        {stageRecipients.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div style={{
                      padding: 7,
                      display: 'flex', flexDirection: 'column', gap: 5,
                      maxHeight: 400, overflowY: 'auto',
                    }}>
                      {stageRecipients.length === 0 ? (
                        <div style={{
                          padding: '24px 0', textAlign: 'center',
                          color: 'var(--dim)', opacity: 0.35,
                          fontFamily: 'var(--font-mono)', fontSize: 16, letterSpacing: '0.25em',
                        }}>
                          ···
                        </div>
                      ) : stageRecipients.map(r => {
                        const d = (r.data ?? {}) as Record<string, string>;
                        const displayName = d.firstName || d.first_name || d.name || r.email.split('@')[0];
                        const company = d.company || d.companyName || '';
                        return (
                          <div
                            key={r.id}
                            style={{
                              background: 'rgba(255,255,255,0.025)',
                              border: '1px solid rgba(255,255,255,0.055)',
                              borderRadius: 8, padding: '10px 11px',
                              transition: 'border-color 0.12s, background 0.12s',
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = `${stage.color}55`;
                              e.currentTarget.style.background = `${stage.color}08`;
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.055)';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                            }}
                          >
                            <div style={{
                              fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 400,
                              color: 'var(--text)', marginBottom: company ? 2 : 4, lineHeight: 1.3,
                            }}>
                              {displayName}
                            </div>
                            {company && (
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, lineHeight: 1.2 }}>{company}</div>
                            )}
                            <div style={{
                              fontSize: 10, color: 'var(--dim)',
                              fontFamily: 'var(--font-mono)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {r.email}
                            </div>
                            {r.stage === 'new' && (
                              <button
                                onClick={() => sendNow(r.id)}
                                disabled={sending === r.id}
                                style={{
                                  marginTop: 8,
                                  background: 'rgba(99,102,241,0.1)',
                                  color: '#6366F1',
                                  border: '1px solid rgba(99,102,241,0.2)',
                                  borderRadius: 5, padding: '4px 10px',
                                  fontSize: 10, fontWeight: 700,
                                  cursor: sending === r.id ? 'not-allowed' : 'pointer',
                                  fontFamily: 'var(--font-mono)', width: '100%',
                                  opacity: sending === r.id ? 0.5 : 1,
                                  textTransform: 'uppercase', letterSpacing: '0.05em',
                                  transition: 'all 0.12s',
                                }}
                              >
                                {sending === r.id ? '···' : '▶ Send Now'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Info tiles ─────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { title: 'Send Window', value: `${campaign.sendWindowStart}:00 – ${campaign.sendWindowEnd}:00`, sub: campaign.sendWindowDays, accent: '#6366F1' },
              { title: 'Daily Cap',   value: String(campaign.dailyCap), sub: 'emails / day', accent: '#10B981' },
              { title: 'Timezone',    value: campaign.tz, sub: `${steps.length} step${steps.length !== 1 ? 's' : ''}`, accent: '#F59E0B' },
            ].map(({ title, value, sub, accent }) => (
              <div key={title} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderLeft: `2px solid ${accent}`,
                borderRadius: '0 10px 10px 0',
                padding: '14px 16px',
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--dim)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  marginBottom: 9, fontFamily: 'var(--font-mono)',
                }}>
                  {title}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 400,
                  color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 4,
                }}>
                  {value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* ── Sequence Steps ─────────────────────────────────────────── */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{
              padding: '13px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.01em' }}>Sequence Steps</span>
              {!showAddStep && (
                <button
                  onClick={() => setShowAddStep(true)}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: 11, fontWeight: 700, color: 'var(--indigo)',
                    cursor: 'pointer', padding: 0,
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  + Add Step
                </button>
              )}
            </div>

            {steps.length === 0 && !showAddStep && (
              <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
                No steps yet — add your first email step
              </div>
            )}

            {steps.map((step, idx) => (
              <div key={step.id} style={{
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#6366F1', flexShrink: 0,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {step.stepNumber}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {step.subjectTemplate}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {step.delayDaysFromPrevious === 0 ? 'send immediately' : `wait ${step.delayDaysFromPrevious}d`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteStep(step.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--dim)', fontSize: 13, padding: '4px 6px', borderRadius: 4,
                    transition: 'color 0.12s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--coral)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--dim)')}
                >
                  ✕
                </button>
              </div>
            ))}

            {showAddStep && (
              <form onSubmit={addStep} style={{
                padding: 18,
                borderTop: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.015)',
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--indigo)',
                  marginBottom: 14, fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  Step {(steps[steps.length - 1]?.stepNumber ?? 0) + 1}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Subject</label>
                    <input type="text" required style={iStyle} placeholder="Hey {{first_name}}!"
                      value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                      onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Delay (days)</label>
                    <input type="number" min={0} style={iStyle}
                      value={draft.delayDays} onChange={e => setDraft(d => ({ ...d, delayDays: Number(e.target.value) }))}
                      onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                    Body — use {`{{variable}}`} for merge fields
                  </label>
                  <textarea required rows={6} style={{ ...iStyle, resize: 'none' as const }}
                    placeholder={"Hi {{first_name}},\n\nYour message here...\n\nBest,\nYour Name"}
                    value={draft.bodyText} onChange={e => setDraft(d => ({ ...d, bodyText: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" disabled={addingStep} style={{
                    background: addingStep ? 'rgba(99,102,241,0.4)' : 'var(--indigo)', color: '#fff', border: 'none',
                    padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                    cursor: addingStep ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>
                    {addingStep ? '···' : 'Add Step'}
                  </button>
                  <button type="button" onClick={() => setShowAddStep(false)} style={{
                    background: 'none', border: 'none', padding: '8px 12px',
                    fontSize: 12, fontWeight: 500, color: 'var(--muted)', cursor: 'pointer',
                  }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── CSV Upload ─────────────────────────────────────────────── */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Upload Recipients</div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>
                CSV needs an <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>email</code> column. Extra columns become merge variables.
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCSV(f); e.target.value = ''; }} />
              <button
                onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{
                  width: '100%', background: 'none',
                  border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 9,
                  padding: '20px 0', fontSize: 12, fontWeight: 500,
                  color: 'var(--dim)',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                }}
                onMouseOver={e => { if (!uploading) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'; e.currentTarget.style.color = 'var(--indigo)'; } }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--dim)'; }}
              >
                {uploading ? '···' : '↑  click to upload csv'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
