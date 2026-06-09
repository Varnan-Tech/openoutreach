'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

const STATUS_CFG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:     { label: 'Draft',     dot: '#94A3B8', text: '#475569', bg: '#F1F5F9' },
  active:    { label: 'Active',    dot: '#22C55E', text: '#15803D', bg: '#F0FDF4' },
  paused:    { label: 'Paused',    dot: '#F59E0B', text: '#B45309', bg: '#FFFBEB' },
  completed: { label: 'Completed', dot: '#6366F1', text: '#4338CA', bg: '#EEF2FF' },
};

const STAGES = ['new', 'in_sequence', 'replied', 'bounced', 'completed'] as const;
const STAGE_LABEL: Record<string, string> = {
  new: 'New', in_sequence: 'In Seq', opened: 'Opened', replied: 'Replied', bounced: 'Bounced', unsubscribed: 'Unsub', completed: 'Done',
};
const STAGE_COLOR: Record<string, string> = {
  new: '#94A3B8', in_sequence: '#6366F1', opened: '#F59E0B', replied: '#22C55E', bounced: '#EF4444', unsubscribed: '#64748B', completed: '#8B5CF6',
};
const STAGE_BG: Record<string, string> = {
  new: '#F8FAFC', in_sequence: '#EEF2FF', opened: '#FFFBEB', replied: '#F0FDF4', bounced: '#FEF2F2', unsubscribed: '#F1F5F9', completed: '#F5F3FF',
};

type StepDraft = { subject: string; bodyText: string; delayDays: number };

const iStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #E2E8F0', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, color: '#0F172A',
  background: '#fff', outline: 'none', fontFamily: 'inherit',
};

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
};

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
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

  if (!campaign) return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#94A3B8', fontSize: 14 }}>Loading…</span>
    </div>
  );

  const counts: Record<string, number> = {};
  STAGES.forEach(s => { counts[s] = recipients.filter(r => r.stage === s).length; });
  const sc = STATUS_CFG[campaign.status] ?? STATUS_CFG.draft;

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 32px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div>
          <a href="/" style={{ fontSize: 13, color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>← Dashboard</a>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>{campaign.fromEmail}</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>{campaign.name}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                color: sc.text, background: sc.bg,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                {sc.label}
              </span>
              {campaign.status === 'draft' && (
                <button
                  onClick={launch} disabled={launching}
                  style={{
                    background: launching ? '#86EFAC' : '#22C55E', color: '#fff', border: 'none',
                    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: launching ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 1px 3px rgba(34,197,94,0.3)',
                  }}
                >
                  {launching ? 'Launching…' : '▶ Launch'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Flash */}
        {msg && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: msgType === 'ok' ? '#F0FDF4' : '#FEF2F2',
            color: msgType === 'ok' ? '#15803D' : '#B91C1C',
            border: `1px solid ${msgType === 'ok' ? '#BBF7D0' : '#FECACA'}`,
          }}>
            {msg}
          </div>
        )}

        {/* Stage counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {STAGES.map(s => (
            <div key={s} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: counts[s] > 0 ? STAGE_COLOR[s] : '#CBD5E1', letterSpacing: '-0.02em', marginBottom: 2 }}>
                {counts[s] ?? 0}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {STAGE_LABEL[s]}
              </div>
            </div>
          ))}
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Send Window</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{campaign.sendWindowStart}:00 – {campaign.sendWindowEnd}:00</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{campaign.sendWindowDays}</div>
          </div>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Daily Cap</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{campaign.dailyCap}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>emails / day</div>
          </div>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Timezone</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{campaign.tz}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{steps.length} step{steps.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Sequence Steps */}
        <div style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Sequence Steps</span>
            {!showAddStep && (
              <button
                onClick={() => setShowAddStep(true)}
                style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#6366F1', cursor: 'pointer', padding: 0 }}
              >
                + Add Step
              </button>
            )}
          </div>

          {steps.length === 0 && !showAddStep && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              No steps yet — add your first email step
            </div>
          )}

          {steps.map(step => (
            <div key={step.id} style={{
              padding: '14px 20px', borderBottom: '1px solid #F8FAFC',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#EEF2FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#6366F1', flexShrink: 0,
                }}>
                  {step.stepNumber}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {step.subjectTemplate}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {step.delayDaysFromPrevious === 0 ? 'Send immediately' : `Wait ${step.delayDaysFromPrevious} day${step.delayDaysFromPrevious !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteStep(step.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: 16, flexShrink: 0, padding: '4px 6px', borderRadius: 4 }}
                onMouseOver={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseOut={e => (e.currentTarget.style.color = '#CBD5E1')}
                title="Delete step"
              >
                ✕
              </button>
            </div>
          ))}

          {showAddStep && (
            <form onSubmit={addStep} style={{ padding: 20, background: '#FAFBFF', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>
                Step {(steps[steps.length - 1]?.stepNumber ?? 0) + 1}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>Subject template</label>
                  <input type="text" required style={iStyle} placeholder="Hey {{first_name}}!"
                    value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = '#6366F1')}
                    onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>Delay (days)</label>
                  <input type="number" min={0} style={iStyle}
                    value={draft.delayDays} onChange={e => setDraft(d => ({ ...d, delayDays: Number(e.target.value) }))}
                    onFocus={e => (e.target.style.borderColor = '#6366F1')}
                    onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }}>
                  Body — use {`{{variable}}`} for merge fields
                </label>
                <textarea required rows={6} style={{ ...iStyle, resize: 'none' as const }}
                  placeholder={"Hi {{first_name}},\n\nYour message here...\n\nBest,\nYour Name"}
                  value={draft.bodyText} onChange={e => setDraft(d => ({ ...d, bodyText: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = '#6366F1')}
                  onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={addingStep} style={{
                  background: addingStep ? '#A5B4FC' : '#4F46E5', color: '#fff', border: 'none',
                  padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: addingStep ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>
                  {addingStep ? 'Adding…' : 'Add Step'}
                </button>
                <button type="button" onClick={() => setShowAddStep(false)} style={{
                  background: 'none', border: 'none', padding: '9px 14px',
                  fontSize: 13, fontWeight: 500, color: '#64748B', cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* CSV Upload */}
        <div style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Upload Recipients</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>
              CSV needs an <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>email</code> column. Extra columns become template variables.
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadCSV(f); e.target.value = ''; }} />
            <button
              onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{
                width: '100%', background: 'none', border: '2px dashed #E2E8F0', borderRadius: 10,
                padding: '20px 0', fontSize: 13, fontWeight: 600, color: '#94A3B8',
                cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              }}
              onMouseOver={e => { if (!uploading) { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1'; } }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#94A3B8'; }}
            >
              {uploading ? 'Uploading…' : '↑  Click to upload CSV'}
            </button>
          </div>
        </div>

        {/* Recipients */}
        {recipients.length > 0 && (
          <div style={card}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              Recipients ({recipients.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Email', 'Stage', 'Step', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 100).map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < Math.min(recipients.length, 100) - 1 ? '1px solid #F8FAFC' : 'none' }}>
                    <td style={{ padding: '11px 20px', fontSize: 13, color: '#334155' }}>{r.email}</td>
                    <td style={{ padding: '11px 20px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                        color: STAGE_COLOR[r.stage] ?? '#94A3B8',
                        background: STAGE_BG[r.stage] ?? '#F8FAFC',
                      }}>
                        {STAGE_LABEL[r.stage] ?? r.stage}
                      </span>
                    </td>
                    <td style={{ padding: '11px 20px', fontSize: 13, color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
                      {r.currentStep || '—'}
                    </td>
                    <td style={{ padding: '7px 20px' }}>
                      {r.stage === 'new' && (
                        <button
                          onClick={() => sendNow(r.id)}
                          disabled={sending === r.id}
                          style={{
                            background: sending === r.id ? '#A5B4FC' : '#EEF2FF',
                            color: sending === r.id ? '#6366F1' : '#4F46E5',
                            border: 'none', borderRadius: 6, padding: '4px 10px',
                            fontSize: 11, fontWeight: 700, cursor: sending === r.id ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', whiteSpace: 'nowrap',
                          }}
                        >
                          {sending === r.id ? '…' : '▶ Send'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recipients.length > 100 && (
              <div style={{ padding: '10px 20px', fontSize: 12, color: '#94A3B8' }}>+ {recipients.length - 100} more</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
