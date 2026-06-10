'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

// ─── Design tokens (used for kanban — referenced from CSS vars) ───────────────
const KANBAN_STAGES = [
  { id: 'new',          label: 'New',        color: '#64748B' },
  { id: 'in_sequence',  label: 'In Sequence',color: '#6366F1' },
  { id: 'opened',       label: 'Opened',     color: '#F59E0B' },
  { id: 'replied',      label: 'Replied',    color: '#10B981' },
  { id: 'bounced',      label: 'Bounced',    color: '#FB7185' },
  { id: 'unsubscribed', label: 'Unsub',      color: '#475569' },
  { id: 'completed',    label: 'Done',       color: '#8B5CF6' },
] as const;

const STATUS_CFG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:     { label: 'Draft',     dot: '#64748B', text: 'rgba(232,234,240,0.5)', bg: 'rgba(100,116,139,0.08)' },
  active:    { label: 'Active',    dot: '#10B981', text: '#10B981',              bg: 'rgba(16,185,129,0.1)'   },
  paused:    { label: 'Paused',    dot: '#F59E0B', text: '#F59E0B',              bg: 'rgba(245,158,11,0.1)'   },
  completed: { label: 'Completed', dot: '#8B5CF6', text: '#8B5CF6',              bg: 'rgba(139,92,246,0.1)'   },
};

type StepDraft = { subject: string; bodyText: string; delayDays: number };

// ─── Input shared styles ──────────────────────────────────────────────────────
const iStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--border-2)', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, color: 'var(--text)',
  background: 'var(--surface-2)', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

// ─── Component ────────────────────────────────────────────────────────────────
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

  if (!campaign) return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 52px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--dim)', fontSize: 14 }}>Loading…</span>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 52px)', fontFamily: 'var(--font-ui)' }}>

      {/* ── Top header bar ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>← Campaigns</a>
          <span style={{ color: 'var(--border-2)' }}>/</span>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400,
            color: 'var(--text)', margin: 0, letterSpacing: '0.01em',
          }}>
            {campaign.name}
          </h1>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 5,
            background: sc.bg, fontSize: 11, fontWeight: 600, color: sc.text,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
            {sc.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>{campaign.fromEmail}</span>
          {campaign.status === 'draft' && (
            <button
              onClick={launch} disabled={launching}
              style={{
                background: launching ? 'rgba(16,185,129,0.3)' : 'var(--emerald)',
                color: 'var(--bg)', border: 'none', padding: '7px 16px',
                borderRadius: 7, fontSize: 12, fontWeight: 700,
                cursor: launching ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {launching ? 'Launching…' : '▶ Launch'}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 28px', display: 'flex', gap: 0, overflowX: 'auto',
      }}>
        {[
          { label: 'Total',    value: recipients.length,       color: 'var(--text)' },
          { label: 'In Seq',   value: counts.in_sequence || 0, color: '#6366F1' },
          { label: 'Opened',   value: counts.opened || 0,      color: '#F59E0B' },
          { label: 'Open %',   value: openRate + (openRate !== '—' ? '%' : ''), color: '#F59E0B' },
          { label: 'Replied',  value: counts.replied || 0,     color: '#10B981' },
          { label: 'Reply %',  value: replyRate + (replyRate !== '—' ? '%' : ''), color: '#10B981' },
          { label: 'Bounced',  value: counts.bounced || 0,     color: '#FB7185' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '12px 24px 12px 0', marginRight: 24,
            borderRight: '1px solid var(--border)', flexShrink: 0,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 400, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Flash ──────────────────────────────────────────────────────────── */}
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

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Kanban board ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
            Recipients by Stage
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {KANBAN_STAGES.map(stage => {
              const stageRecipients = recipients.filter(r => r.stage === stage.id);
              return (
                <div key={stage.id} style={{
                  minWidth: 212, maxWidth: 212, flexShrink: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 11, overflow: 'hidden',
                  borderTop: `2px solid ${stage.color}`,
                }}>
                  {/* Column header */}
                  <div style={{
                    padding: '10px 13px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
                      {stage.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--dim)',
                      background: 'rgba(255,255,255,0.04)', padding: '1px 7px', borderRadius: 4,
                    }}>
                      {stageRecipients.length}
                    </span>
                  </div>
                  {/* Cards */}
                  <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                    {stageRecipients.length === 0 ? (
                      <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>—</div>
                    ) : stageRecipients.map(r => {
                      const d = (r.data ?? {}) as Record<string, string>;
                      const displayName = d.firstName || d.first_name || d.name || r.email.split('@')[0];
                      const company = d.company || d.companyName || '';
                      return (
                        <div key={r.id} style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 8, padding: '10px 11px',
                          transition: 'border-color 0.15s',
                        }}
                          onMouseOver={e => (e.currentTarget.style.borderColor = `${stage.color}40`)}
                          onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                        >
                          <div style={{
                            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 400,
                            color: 'var(--text)', marginBottom: company ? 2 : 4, lineHeight: 1.3,
                          }}>
                            {displayName}
                          </div>
                          {company && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{company}</div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.email}
                          </div>
                          {r.stage === 'new' && (
                            <button
                              onClick={() => sendNow(r.id)}
                              disabled={sending === r.id}
                              style={{
                                marginTop: 8, background: 'rgba(99,102,241,0.1)',
                                color: '#6366F1', border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: 5, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                                cursor: sending === r.id ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit', width: '100%',
                                opacity: sending === r.id ? 0.5 : 1,
                              }}
                            >
                              {sending === r.id ? '…' : '▶ Send Now'}
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

        {/* ── Campaign info row ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { title: 'Send Window', value: `${campaign.sendWindowStart}:00 – ${campaign.sendWindowEnd}:00`, sub: campaign.sendWindowDays },
            { title: 'Daily Cap', value: campaign.dailyCap, sub: 'emails / day' },
            { title: 'Timezone', value: campaign.tz, sub: `${steps.length} step${steps.length !== 1 ? 's' : ''}` },
          ].map(({ title, value, sub }) => (
            <div key={title} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 11, padding: '16px 18px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                {title}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Sequence Steps ────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sequence Steps</span>
            {!showAddStep && (
              <button onClick={() => setShowAddStep(true)} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--indigo)', cursor: 'pointer', padding: 0 }}>
                + Add Step
              </button>
            )}
          </div>

          {steps.length === 0 && !showAddStep && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
              No steps yet — add your first email step
            </div>
          )}

          {steps.map(step => (
            <div key={step.id} style={{
              padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: 'rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#6366F1', flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {step.stepNumber}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {step.subjectTemplate}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                    {step.delayDaysFromPrevious === 0 ? 'Send immediately' : `Wait ${step.delayDaysFromPrevious} day${step.delayDaysFromPrevious !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteStep(step.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 14, padding: '4px 6px', borderRadius: 4 }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--coral)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--dim)')}
              >
                ✕
              </button>
            </div>
          ))}

          {showAddStep && (
            <form onSubmit={addStep} style={{ padding: 18, borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', marginBottom: 14, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Step {(steps[steps.length - 1]?.stepNumber ?? 0) + 1}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Subject template</label>
                  <input type="text" required style={iStyle} placeholder="Hey {{first_name}}!"
                    value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Delay (days)</label>
                  <input type="number" min={0} style={iStyle}
                    value={draft.delayDays} onChange={e => setDraft(d => ({ ...d, delayDays: Number(e.target.value) }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
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
                  padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  cursor: addingStep ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>
                  {addingStep ? 'Adding…' : 'Add Step'}
                </button>
                <button type="button" onClick={() => setShowAddStep(false)} style={{
                  background: 'none', border: 'none', padding: '8px 12px',
                  fontSize: 13, fontWeight: 500, color: 'var(--muted)', cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── CSV Upload ────────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Upload Recipients</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>
              CSV needs an <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>email</code> column. Extra columns become merge variables.
            </div>
          </div>
          <div style={{ padding: 18 }}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadCSV(f); e.target.value = ''; }} />
            <button
              onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{
                width: '100%', background: 'none',
                border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 9,
                padding: '20px 0', fontSize: 13, fontWeight: 500, color: 'var(--dim)',
                cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseOver={e => { if (!uploading) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = 'var(--indigo)'; } }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--dim)'; }}
            >
              {uploading ? 'Uploading…' : '↑  Click to upload CSV'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
