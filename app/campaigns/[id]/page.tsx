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
  const [showSettings, setShowSettings] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [detailRecipient, setDetailRecipient] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddLead, setShowAddLead] = useState(false);
  const [singleLead, setSingleLead] = useState<Record<string, string>>({ email: '' });
  const [addingLead, setAddingLead] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [runningDispatch, setRunningDispatch] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<{ name: string; fromEmail: string; fromName: string; unosendApiKey: string; sendWindowStart: number; sendWindowEnd: number; sendWindowDays: string; tz: string; dailyCap: number } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const editBodyRef = useRef<HTMLTextAreaElement>(null);
  const [editDraft, setEditDraft] = useState<{ id: string; subject: string; bodyText: string; delayDays: number }>({ id: '', subject: '', bodyText: '', delayDays: 0 });
  const [savingStep, setSavingStep] = useState(false);
  function toggleSelect(rid: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(rid) ? next.delete(rid) : next.add(rid);
      return next;
    });
  }

  const reload = useCallback(() => {
    fetch(`/api/campaigns/${id}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setCampaign(d); });
    fetch(`/api/campaigns/${id}/recipients`).then(r => r.ok ? r.json() : []).then(setRecipients);
    fetch(`/api/campaigns/${id}/steps`).then(r => r.ok ? r.json() : []).then(setSteps);
    setSelectedIds(new Set());
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

  async function openDetail(recipientId: string) {
    setDetailLoading(true);
    setDetailRecipient({ id: recipientId, _loading: true });
    const res = await fetch(`/api/campaigns/${id}/recipients/${recipientId}`);
    if (res.ok) setDetailRecipient(await res.json());
    else setDetailRecipient(null);
    setDetailLoading(false);
  }

  async function changeStage(recipientId: string, stage: string) {
    const res = await fetch(`/api/campaigns/${id}/recipients/${recipientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      reload();
      setDetailRecipient((prev: any) => prev ? { ...prev, stage } : null);
    } else { flash('Failed to change stage', 'error'); }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsDraft) return;
    setSavingSettings(true);
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settingsDraft, fromDomain: settingsDraft.fromEmail.split('@')[1] ?? '' }),
    });
    if (res.ok) { flash('Settings saved', 'ok'); reload(); setShowSettings(false); }
    else flash('Failed to save settings', 'error');
    setSavingSettings(false);
  }

  async function togglePause() {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) reload();
    else flash('Failed to update campaign status', 'error');
  }

  function exportCSV() {
    if (!recipients.length) return;
    const escapeCSV = (val: string) =>
      val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')
        ? `"${val.replace(/"/g, '""')}"` : val;
    const dataKeys = Array.from(
      new Set(recipients.flatMap(r => Object.keys((r.data as Record<string, string>) ?? {})))
    );
    const rawHeaders = ['email', 'stage', 'currentStep', ...dataKeys];
    const headers = rawHeaders.map(escapeCSV);
    const rows = recipients.map(r => {
      const d = (r.data as Record<string, string>) ?? {};
      return rawHeaders.map(h => {
        const val = h === 'email' ? r.email : h === 'stage' ? r.stage : h === 'currentStep' ? String(r.currentStep) : (d[h] ?? '');
        return escapeCSV(val);
      }).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${campaign.name.replace(/\s+/g, '-')}-recipients.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function deleteRecipient(recipientId: string) {
    if (!confirm('Delete this recipient? This cannot be undone.')) return;
    const res = await fetch(`/api/campaigns/${id}/recipients/${recipientId}`, { method: 'DELETE' });
    if (res.ok) { setDetailRecipient(null); reload(); }
    else flash('Failed to delete recipient', 'error');
  }

  async function deleteSelected() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} recipient(s)? This cannot be undone.`)) return;
    const results = await Promise.all([...selectedIds].map(rid =>
      fetch(`/api/campaigns/${id}/recipients/${rid}`, { method: 'DELETE' })
    ));
    if (detailRecipient && selectedIds.has(detailRecipient.id)) setDetailRecipient(null);
    if (!results.every(r => r.ok)) flash('Some deletions failed', 'error');
    setSelectedIds(new Set());
    reload();
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

  async function addSingleLead(e: React.FormEvent) {
    e.preventDefault();
    if (!singleLead.email?.trim()) return;
    setAddingLead(true);
    const keys = Object.keys(singleLead);
    const csvHeader = keys.join(',');
    const csvRow = keys.map(k => {
      const v = singleLead[k] ?? '';
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',');
    const res = await fetch(`/api/campaigns/${id}/recipients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: `${csvHeader}\n${csvRow}` }),
    });
    const data = await res.json();
    if (res.ok) {
      flash(`Lead added`, 'ok');
      setSingleLead({ email: '' });
      setNewFieldName('');
      setShowAddLead(false);
      reload();
    } else flash(data.error ?? 'Failed to add lead', 'error');
    setAddingLead(false);
  }

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const counts: Record<string, number> = {};
  KANBAN_STAGES.forEach(s => { counts[s.id] = recipients.filter(r => r.stage === s.id).length; });
  const totalSent = (counts.in_sequence || 0) + (counts.opened || 0) + (counts.replied || 0) + (counts.bounced || 0) + (counts.completed || 0);
  const openRate  = totalSent > 0 ? (((counts.opened || 0) + (counts.replied || 0)) / totalSent * 100).toFixed(1) : '—';
  const replyRate = totalSent > 0 ? ((counts.replied || 0) / totalSent * 100).toFixed(1) : '—';

  // Dynamic Kanban columns: New → one column per step → Replied / Bounced / Unsub / Done
  const cumulativeDays = steps.reduce<number[]>((acc, step, i) => {
    acc.push((acc[i - 1] ?? 0) + (step.delayDaysFromPrevious ?? 0));
    return acc;
  }, []);
  const kanbanCols = [
    { id: 'new',          label: 'New Leads', color: '#64748B', filter: (r: any) => r.stage === 'new' },
    ...steps.map((step: any, i: number) => ({
      id: `step_${step.stepNumber}`,
      label: `Day ${cumulativeDays[i]} Sent`,
      color: '#6366F1',
      filter: (r: any) => (r.stage === 'in_sequence' || r.stage === 'opened') && r.currentStep === step.stepNumber,
    })),
    { id: 'replied',      label: 'Replied',   color: '#10B981', filter: (r: any) => r.stage === 'replied' },
    { id: 'bounced',      label: 'Bounced',   color: '#FB7185', filter: (r: any) => r.stage === 'bounced' },
    { id: 'unsubscribed', label: 'Unsub',     color: '#475569', filter: (r: any) => r.stage === 'unsubscribed' },
    { id: 'completed',    label: 'Done',      color: '#8B5CF6', filter: (r: any) => r.stage === 'completed' },
  ];
  const sc = STATUS_CFG[campaign?.status] ?? STATUS_CFG.draft;
  const dataKeys = Array.from(new Set(recipients.flatMap(r => Object.keys((r.data as Record<string, string>) ?? {}))));
  // insert {{var}} at textarea cursor
  function insertVar(key: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const token = `{{${key}}}`;
    const next = ta.value.slice(0, start) + token + ta.value.slice(end);
    setDraft(d => ({ ...d, bodyText: next }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + token.length, start + token.length); }, 0);
  }

  function insertVarEdit(key: string) {
    const ta = editBodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const token = `{{${key}}}`;
    const next = ta.value.slice(0, start) + token + ta.value.slice(end);
    setEditDraft(d => ({ ...d, bodyText: next }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + token.length, start + token.length); }, 0);
  }

  async function runDispatcher() {
    if (runningDispatch) return;
    setRunningDispatch(true);
    try {
      const res = await fetch('/api/cron');
      const data = await res.json();
      if (res.ok) flash(data.message ?? `Dispatched ${data.sent ?? 0} email(s)`, 'ok');
      else flash(data.error ?? 'Dispatcher failed', 'error');
      reload();
    } catch {
      flash('Dispatcher failed', 'error');
    }
    setRunningDispatch(false);
  }

  async function updateStep(e: React.FormEvent) {
    e.preventDefault();
    setSavingStep(true);
    const html = editDraft.bodyText.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    const res = await fetch(`/api/campaigns/${id}/steps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editDraft.id,
        subjectTemplate: editDraft.subject,
        bodyHtmlTemplate: html,
        bodyTextTemplate: editDraft.bodyText,
        delayDaysFromPrevious: editDraft.delayDays,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      flash('Step saved', 'ok');
      setSelectedStep(null);
      setShowSteps(true);
      reload();
    } else flash(data.error ?? 'Failed to save', 'error');
    setSavingStep(false);
  }

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
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{campaign.fromEmail}</span>
            <button
              onClick={() => setShowSteps(s => !s)}
              style={{
                background: showSteps ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showSteps ? 'var(--border-2)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 6, height: 30, padding: '0 12px',
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', color: showSteps ? 'var(--text)' : 'var(--muted)',
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s', flexShrink: 0, position: 'relative',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseOut={e => { if (!showSteps) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted)'; } }}
            >
              Email Template & Follow-up
              {steps.length > 0 && (
                <span style={{
                  background: '#6366F1', color: '#fff',
                  fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  padding: '1px 5px', borderRadius: 8,
                }}>
                  {steps.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowUpload(s => !s)}
              style={{
                background: showUpload ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showUpload ? 'var(--border-2)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 6, height: 30, padding: '0 12px',
                display: 'flex', alignItems: 'center',
                cursor: 'pointer', color: showUpload ? 'var(--text)' : 'var(--muted)',
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseOut={e => { if (!showUpload) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted)'; } }}
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowAddLead(s => !s)}
              style={{
                background: showAddLead ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showAddLead ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 6, height: 30, padding: '0 12px',
                display: 'flex', alignItems: 'center',
                cursor: 'pointer', color: showAddLead ? '#818CF8' : 'var(--muted)',
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#818CF8'; }}
              onMouseOut={e => { if (!showAddLead) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted)'; } }}
            >
              + Add Lead
            </button>
            <button
              onClick={runDispatcher}
              disabled={runningDispatch}
              style={{
                background: runningDispatch ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${runningDispatch ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.2)'}`,
                borderRadius: 6, height: 30, padding: '0 12px',
                display: 'flex', alignItems: 'center',
                cursor: runningDispatch ? 'not-allowed' : 'pointer',
                color: runningDispatch ? '#6EE7B7' : '#10B981',
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseOver={e => { if (!runningDispatch) { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; } }}
              onMouseOut={e => { if (!runningDispatch) { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; } }}
            >
              {runningDispatch ? 'Dispatching···' : '▶ Run Dispatcher'}
            </button>
            <button
              onClick={() => {
                if (!showSettings && campaign) {
                  setSettingsDraft({
                    name: campaign.name,
                    fromEmail: campaign.fromEmail,
                    fromName: campaign.fromName,
                    unosendApiKey: campaign.unosendApiKey ?? '',
                    sendWindowStart: campaign.sendWindowStart,
                    sendWindowEnd: campaign.sendWindowEnd,
                    sendWindowDays: campaign.sendWindowDays,
                    tz: campaign.tz,
                    dailyCap: campaign.dailyCap,
                  });
                }
                setShowSettings(s => !s);
              }}
              style={{
                background: showSettings ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showSettings ? 'var(--border-2)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 6, height: 30, padding: '0 12px',
                display: 'flex', alignItems: 'center',
                cursor: 'pointer', color: showSettings ? 'var(--text)' : 'var(--muted)',
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseOut={e => { if (!showSettings) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted)'; } }}
            >
              Settings
            </button>
            {(campaign.status === 'active' || campaign.status === 'paused') && (
              <button
                onClick={togglePause}
                style={{
                  background: campaign.status === 'paused' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  color: campaign.status === 'paused' ? '#10B981' : '#F59E0B',
                  border: `1px solid ${campaign.status === 'paused' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  padding: '6px 14px', borderRadius: 6,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {campaign.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}
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
          padding: '10px 28px',
          display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'stretch',
        }}>
          {/* Total */}
          <div style={{
            padding: '9px 18px', borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', flexDirection: 'column', gap: 5, minWidth: 72,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>{String(recipients.length)}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Total</div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'var(--border-2)', flexShrink: 0, margin: '2px 4px' }} />

          {/* Sequence group */}
          <div style={{ display: 'flex', gap: 1, background: 'rgba(99,102,241,0.08)', borderRadius: 9, padding: 3, border: '1px solid rgba(99,102,241,0.22)', flexShrink: 0 }}>
            <div style={{ padding: '7px 16px', borderRadius: 7, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#818CF8', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px #6366F155' }}>{String(counts.in_sequence || 0)}</div>
              <div style={{ fontSize: 9, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>In Seq</div>
            </div>
          </div>

          {/* Open group */}
          <div style={{ display: 'flex', gap: 1, background: 'rgba(245,158,11,0.08)', borderRadius: 9, padding: 3, border: '1px solid rgba(245,158,11,0.22)', flexShrink: 0 }}>
            {[
              { label: 'Opened', value: String(counts.opened || 0) },
              { label: 'Open %', value: openRate === '—' ? '—' : `${openRate}%` },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{ padding: '7px 16px', borderRadius: 7, display: 'flex', flexDirection: 'column', gap: 5, borderRight: i < arr.length - 1 ? '1px solid rgba(245,158,11,0.15)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#FBB740', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px #F59E0B55' }}>{value}</div>
                <div style={{ fontSize: 9, color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Reply group */}
          <div style={{ display: 'flex', gap: 1, background: 'rgba(16,185,129,0.08)', borderRadius: 9, padding: 3, border: '1px solid rgba(16,185,129,0.22)', flexShrink: 0 }}>
            {[
              { label: 'Replied', value: String(counts.replied || 0) },
              { label: 'Reply %', value: replyRate === '—' ? '—' : `${replyRate}%` },
            ].map(({ label, value }, i, arr) => (
              <div key={label} style={{ padding: '7px 16px', borderRadius: 7, display: 'flex', flexDirection: 'column', gap: 5, borderRight: i < arr.length - 1 ? '1px solid rgba(16,185,129,0.15)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#34D399', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px #10B98155' }}>{value}</div>
                <div style={{ fontSize: 9, color: '#6EE7B7', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Bounced */}
          <div style={{ display: 'flex', background: 'rgba(251,113,133,0.08)', borderRadius: 9, padding: 3, border: '1px solid rgba(251,113,133,0.22)', flexShrink: 0 }}>
            <div style={{ padding: '7px 16px', borderRadius: 7, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#FB7185', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px #FB718555' }}>{String(counts.bounced || 0)}</div>
              <div style={{ fontSize: 9, color: '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Bounced</div>
            </div>
          </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
                Recipients by Stage
              </span>
              <span style={{ fontSize: 9, color: 'var(--border-2)', fontFamily: 'var(--font-mono)' }}>—</span>
              <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{recipients.length} total</span>
              <div style={{ flex: 1 }} />
              {recipients.length > 0 && (
                <button
                  onClick={exportCSV}
                  style={{
                    background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5,
                    padding: '3px 10px', fontSize: 9, fontWeight: 700, color: 'var(--muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const, transition: 'all 0.12s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#818CF8'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  ↓ Export CSV
                </button>
              )}
            </div>
            {selectedIds.size > 0 && (
              <div style={{
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 8, padding: '8px 14px',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#818CF8', fontFamily: 'var(--font-mono)' }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={deleteSelected}
                  style={{ background: 'rgba(251,113,133,0.1)', color: '#FB7185', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 5, padding: '3px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{ background: 'none', border: 'none', color: 'var(--dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                >
                  ✕ Clear
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
              {kanbanCols.map((col, idx) => {
                const stageRecipients = recipients.filter(col.filter);
                const isEmpty = stageRecipients.length === 0;
                return (
                  <div
                    key={col.id}
                    className="oo-kanban-col"
                    style={{
                      minWidth: 210, maxWidth: 210, flexShrink: 0,
                      background: isEmpty ? 'rgba(255,255,255,0.02)' : 'var(--surface)',
                      border: `1px solid ${isEmpty ? 'rgba(255,255,255,0.09)' : 'var(--border)'}`,
                      borderRadius: 10, overflow: 'hidden',
                      borderTop: `2px solid ${isEmpty ? col.color + '55' : col.color}`,
                      animationDelay: `${idx * 45}ms`,
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    {/* Column header */}
                    <div style={{
                      padding: '9px 11px',
                      display: 'flex', alignItems: 'center', gap: 7,
                      background: `linear-gradient(180deg, ${col.color}${isEmpty ? '06' : '0D'} 0%, transparent 100%)`,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: isEmpty ? col.color + '70' : col.color, flexShrink: 0,
                        boxShadow: isEmpty ? `0 0 4px ${col.color}40` : `0 0 6px ${col.color}90`,
                      }} />
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: isEmpty ? 'var(--muted)' : 'var(--text)',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        flex: 1, fontFamily: 'var(--font-mono)',
                      }}>
                        {col.label}
                      </span>
                      {!isEmpty && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: col.color,
                          background: `${col.color}22`,
                          padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                        }}>
                          {stageRecipients.length}
                        </span>
                      )}
                      {col.id === 'new' && stageRecipients.length > 0 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const newIds = stageRecipients.map(r => r.id);
                            const allSelected = newIds.every(nid => selectedIds.has(nid));
                            if (allSelected) setSelectedIds(prev => { const n = new Set(prev); newIds.forEach(nid => n.delete(nid)); return n; });
                            else setSelectedIds(prev => new Set([...prev, ...newIds]));
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 9, fontFamily: 'var(--font-mono)', padding: '0 4px' }}
                          title="Select all new"
                        >
                          ⊞
                        </button>
                      )}
                    </div>

                    {/* Cards */}
                    <div style={{
                      padding: isEmpty ? '0 8px 8px' : 6,
                      display: 'flex', flexDirection: 'column', gap: 4,
                      maxHeight: 380, overflowY: 'auto',
                    }}>
                      {isEmpty ? (
                        <div style={{
                          margin: '4px 0 2px',
                          border: '1px dashed rgba(255,255,255,0.1)',
                          borderRadius: 6, padding: '14px 0',
                          textAlign: 'center',
                          color: 'var(--muted)',
                          fontSize: 9, fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                        }}>
                          empty
                        </div>
                      ) : stageRecipients.map(r => {
                        const d = (r.data ?? {}) as Record<string, string>;
                        const displayName = d.firstName || d.first_name || d.name || r.email.split('@')[0];
                        const company = d.company || d.companyName || '';
                        return (
                          <div
                            key={r.id}
                            onClick={() => openDetail(r.id)}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.11)',
                              borderRadius: 8, padding: '10px 11px',
                              transition: 'border-color 0.12s, background 0.12s',
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = `${stage.color}70`;
                              e.currentTarget.style.background = `${stage.color}12`;
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            }}
                          >
                            {r.stage === 'new' && (
                              <div
                                onClick={e => { e.stopPropagation(); toggleSelect(r.id); }}
                                style={{
                                  position: 'absolute', top: 8, right: 8,
                                  width: 16, height: 16, borderRadius: 4,
                                  border: `1px solid ${selectedIds.has(r.id) ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.15)'}`,
                                  background: selectedIds.has(r.id) ? 'rgba(99,102,241,0.3)' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', fontSize: 9, color: '#818CF8',
                                  transition: 'all 0.12s',
                                }}
                              >
                                {selectedIds.has(r.id) && '✓'}
                              </div>
                            )}
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
                              fontSize: 10, color: 'var(--muted)',
                              fontFamily: 'var(--font-mono)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {r.email}
                            </div>
                            {r.stage === 'opened' && (
                              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 4, padding: '2px 7px' }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10B981', letterSpacing: '0.05em' }}>
                                  Opened{r._opens > 1 ? ` ×${r._opens}` : ''}
                                </span>
                              </div>
                            )}
                            {r._opens > 0 && r.stage !== 'opened' && (
                              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '2px 7px' }}>
                                <span style={{ fontSize: 9 }}>👁</span>
                                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.05em' }}>
                                  {r._opens}× opened
                                </span>
                              </div>
                            )}
                            {r.stage === 'new' && (
                              <button
                                onClick={e => { e.stopPropagation(); sendNow(r.id); }}
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

        </div>
      </div>

      {/* ── Upload recipients dialog ─────────────────────────────────────── */}
      {showUpload && (
        <div
          onClick={() => setShowUpload(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRadius: 16, padding: '24px 26px',
              width: 460, maxWidth: 'calc(100vw - 40px)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                  Upload Recipients
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400, color: 'var(--text)' }}>
                  {campaign.name}
                </div>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                  color: 'var(--dim)', fontSize: 14, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dim)'; }}
              >
                ✕
              </button>
            </div>

            {/* Hint */}
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.6 }}>
              CSV needs an{' '}
              <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 3, fontSize: 10, color: 'var(--text)' }}>email</code>
              {' '}column. Extra columns become{' '}
              <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 3, fontSize: 10, color: 'var(--text)' }}>{`{{merge_variables}}`}</code>.
            </div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { uploadCSV(f); setShowUpload(false); } e.target.value = ''; }} />
            <button
              onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{
                width: '100%', background: 'rgba(99,102,241,0.04)',
                border: '1px dashed rgba(99,102,241,0.25)', borderRadius: 10,
                padding: '32px 0', fontSize: 13, fontWeight: 500,
                color: uploading ? 'var(--indigo)' : 'var(--dim)',
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
              onMouseOver={e => { if (!uploading) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = 'var(--indigo)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; } }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.color = 'var(--dim)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
            >
              <span style={{ fontSize: 22, opacity: 0.5 }}>↑</span>
              <span>{uploading ? 'uploading···' : 'click to upload .csv'}</span>
            </button>
            <div style={{ marginTop: 14, fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} already loaded
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div
          onClick={() => { setShowAddLead(false); setSingleLead({ email: '' }); setNewFieldName(''); }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 16, padding: '24px 26px', width: 460, maxWidth: 'calc(100vw - 40px)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', maxHeight: '80vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                  Add Lead
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400, color: 'var(--text)' }}>
                  {campaign.name}
                </div>
              </div>
              <button
                onClick={() => { setShowAddLead(false); setSingleLead({ email: '' }); setNewFieldName(''); }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--dim)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dim)'; }}
              >✕</button>
            </div>

            <form onSubmit={addSingleLead} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* email */}
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Email *</label>
                <input type="email" required style={iStyle} placeholder="lead@company.com"
                  value={singleLead.email ?? ''}
                  onChange={e => setSingleLead(p => ({ ...p, email: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
              </div>

              {/* existing dataKeys fields */}
              {dataKeys.filter(k => k.toLowerCase() !== 'email').map(key => (
                <div key={key}>
                  <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>{key}</label>
                  <input type="text" style={iStyle} placeholder={`{{${key}}}`}
                    value={singleLead[key] ?? ''}
                    onChange={e => setSingleLead(p => ({ ...p, [key]: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                </div>
              ))}

              {/* new custom fields added this session */}
              {Object.keys(singleLead).filter(k => k !== 'email' && !dataKeys.includes(k)).map(key => (
                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: '#818CF8', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>{key} <span style={{ opacity: 0.6 }}>· new</span></label>
                    <input type="text" style={iStyle} placeholder={`{{${key}}}`}
                      value={singleLead[key] ?? ''}
                      onChange={e => setSingleLead(p => ({ ...p, [key]: e.target.value }))}
                      onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                  </div>
                  <button type="button" onClick={() => setSingleLead(p => { const n = { ...p }; delete n[key]; return n; })}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 36, cursor: 'pointer', color: 'var(--dim)', fontSize: 13, flexShrink: 0 }}>✕</button>
                </div>
              ))}

              {/* add new variable */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Add variable</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" style={{ ...iStyle, flex: 1 }} placeholder="e.g. company, title, city"
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value.replace(/\s/g, '_').toLowerCase())}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const k = newFieldName.trim();
                        if (k && k !== 'email' && !(k in singleLead)) { setSingleLead(p => ({ ...p, [k]: '' })); }
                        setNewFieldName('');
                      }
                    }} />
                  <button type="button"
                    onClick={() => { const k = newFieldName.trim(); if (k && k !== 'email' && !(k in singleLead)) { setSingleLead(p => ({ ...p, [k]: '' })); } setNewFieldName(''); }}
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '0 14px', fontSize: 13, color: '#818CF8', cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}>
                    +
                  </button>
                </div>
              </div>

              <button type="submit" disabled={addingLead} style={{
                background: addingLead ? 'rgba(99,102,241,0.4)' : 'var(--indigo)',
                color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0',
                fontSize: 12, fontWeight: 700, cursor: addingLead ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 4,
              }}>
                {addingLead ? 'Adding···' : '+ Add Lead'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Sequence Steps dialog ────────────────────────────────────────── */}
      {showSteps && (
        <div
          onClick={() => { setShowSteps(false); setShowAddStep(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRadius: 16,
              width: 540, maxWidth: 'calc(100vw - 40px)',
              maxHeight: 'calc(100vh - 80px)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                  Email Template & Follow-up
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400, color: 'var(--text)' }}>
                  {campaign.name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!showAddStep && (
                  <button
                    onClick={() => setShowAddStep(true)}
                    style={{
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                      borderRadius: 6, padding: '5px 12px',
                      fontSize: 10, fontWeight: 700, color: '#6366F1',
                      cursor: 'pointer', fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}
                  >
                    + Add Step
                  </button>
                )}
                <button
                  onClick={() => { setShowSteps(false); setShowAddStep(false); }}
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                    color: 'var(--dim)', fontSize: 14, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dim)'; }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Variables bar */}
            {dataKeys.length > 0 && (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(99,102,241,0.04)', flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Available variables</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {dataKeys.map(key => (
                    <span key={key} style={{
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 600,
                      color: '#818CF8', fontFamily: 'var(--font-mono)',
                    }}>
                      {`{{${key}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Steps list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.length === 0 && !showAddStep && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
                  No steps yet
                </div>
              )}

              {steps.map((step) => {
                const preview = (step.bodyTextTemplate ?? '').slice(0, 100).replace(/\n/g, ' ');
                return (
                  <div
                    key={step.id}
                    onClick={() => { setShowSteps(false); setSelectedStep(step); setEditDraft({ id: step.id, subject: step.subjectTemplate ?? '', bodyText: step.bodyTextTemplate ?? '', delayDays: step.delayDaysFromPrevious ?? 0 }); }}
                    style={{
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '13px 14px', cursor: 'pointer',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      display: 'flex', gap: 13, alignItems: 'flex-start',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.12)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#6366F1',
                      fontFamily: 'var(--font-mono)', marginTop: 1,
                    }}>
                      {step.stepNumber}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, overflow: 'hidden' }}>
                        <div style={{ padding: '7px 11px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--font-mono)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Subject</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {step.subjectTemplate || '(no subject)'}
                          </span>
                        </div>
                        <div style={{ padding: '8px 11px', fontSize: 11, color: 'var(--muted)', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {preview || <span style={{ color: 'var(--dim)', fontStyle: 'italic' }}>no body</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: step.delayDaysFromPrevious === 0 ? 'var(--dim)' : '#F59E0B',
                        background: step.delayDaysFromPrevious === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(245,158,11,0.08)',
                        border: `1px solid ${step.delayDaysFromPrevious === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.2)'}`,
                        padding: '3px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {step.delayDaysFromPrevious === 0 ? 'immediate' : `+${step.delayDaysFromPrevious}d`}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteStep(step.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 12, padding: '2px 4px', borderRadius: 4, transition: 'color 0.12s', lineHeight: 1 }}
                        onMouseOver={e => (e.currentTarget.style.color = 'var(--coral)')}
                        onMouseOut={e => (e.currentTarget.style.color = 'var(--dim)')}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add step form */}
              {showAddStep && (
                <form onSubmit={addStep} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--indigo)', marginBottom: 14, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
                    {dataKeys.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                        {dataKeys.map(key => (
                          <button key={key} type="button" onClick={() => insertVar(key)} style={{
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 5, padding: '3px 8px', fontSize: 10, fontWeight: 600,
                            color: '#818CF8', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                            transition: 'all 0.1s',
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                          >
                            {`{{${key}}}`}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea ref={bodyRef} required rows={5} style={{ ...iStyle, resize: 'none' as const }}
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
                    <button type="button" onClick={() => setShowAddStep(false)} style={{ background: 'none', border: 'none', padding: '8px 12px', fontSize: 12, fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step preview dialog ──────────────────────────────────────────── */}
      {selectedStep && (
        <div
          onClick={() => { setSelectedStep(null); setShowSteps(true); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 210,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRadius: 16,
              width: 560, maxWidth: 'calc(100vw - 40px)',
              maxHeight: 'calc(100vh - 80px)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
              overflow: 'hidden',
            }}
          >
            {/* Dialog header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#6366F1',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {selectedStep.stepNumber}
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                    Email Step {selectedStep.stepNumber}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {selectedStep.delayDaysFromPrevious === 0 ? 'sends immediately' : `sends after ${selectedStep.delayDaysFromPrevious} day${selectedStep.delayDaysFromPrevious !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedStep(null); setShowSteps(true); }}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                  color: 'var(--dim)', fontSize: 14, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dim)'; }}
              >
                ✕
              </button>
            </div>

            {/* Variables bar */}
            {dataKeys.length > 0 && (
              <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(99,102,241,0.04)', flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Available variables — click to insert</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {dataKeys.map(key => (
                    <button key={key} type="button" onClick={() => insertVarEdit(key)} style={{
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 600,
                      color: '#818CF8', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all 0.1s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                    >
                      {`{{${key}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Edit form */}
            <form onSubmit={updateStep} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Subject</label>
                  <input type="text" required style={iStyle} placeholder="Hey {{first_name}}!"
                    value={editDraft.subject}
                    onChange={e => setEditDraft(d => ({ ...d, subject: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                </div>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Delay (days)</label>
                  <input type="number" min={0} style={iStyle}
                    value={editDraft.delayDays}
                    onChange={e => setEditDraft(d => ({ ...d, delayDays: Number(e.target.value) }))}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>Body</label>
                <textarea ref={editBodyRef} required rows={10} style={{ ...iStyle, resize: 'none' as const }}
                  placeholder={"Hi {{first_name}},\n\nYour message here...\n\nBest,\nYour Name"}
                  value={editDraft.bodyText}
                  onChange={e => setEditDraft(d => ({ ...d, bodyText: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
              </div>
              <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
                <button type="submit" disabled={savingStep} style={{
                  background: savingStep ? 'rgba(99,102,241,0.4)' : 'var(--indigo)', color: '#fff', border: 'none',
                  padding: '9px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                  cursor: savingStep ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {savingStep ? 'Saving···' : 'Save Step'}
                </button>
                <button type="button" onClick={() => { setSelectedStep(null); setShowSteps(true); }}
                  style={{ background: 'none', border: 'none', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Recipient detail panel ───────────────────────────────────────── */}
      <style>{`
        @keyframes detail-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .oo-detail-panel { animation: detail-in 0.22s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
      {detailRecipient && (
        <div
          onClick={() => setDetailRecipient(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            className="oo-detail-panel"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: 420, maxWidth: '100vw',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border-2)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
            }}
          >
            {detailRecipient._loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                loading···
              </div>
            ) : (() => {
              const d = (detailRecipient.data ?? {}) as Record<string, string>;
              const displayName = d.firstName || d.first_name || d.name || detailRecipient.email.split('@')[0];
              const company = d.company || d.companyName || '';
              const stage = KANBAN_STAGES.find(s => s.id === detailRecipient.stage);
              const sends: any[] = detailRecipient.scheduledSends ?? [];
              const replies: any[] = detailRecipient.replies ?? [];
              const fmt = (d: string) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
              const STATUS_COLOR: Record<string, string> = { sent: '#10B981', pending: '#6366F1', failed: '#FB7185', cancelled: '#64748B' };
              return (
                <>
                  {/* Header */}
                  <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--text)', letterSpacing: '0.01em', marginBottom: 3 }}>
                          {displayName}
                        </div>
                        {company && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>{company}</div>}
                        <a href={`mailto:${detailRecipient.email}`} style={{ fontSize: 11, color: '#6366F1', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
                          {detailRecipient.email}
                        </a>
                      </div>
                      <button
                        onClick={() => setDetailRecipient(null)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--muted)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        onMouseOver={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
                        onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                      >✕</button>
                    </div>
                    {stage && (
                      <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: `${stage.color}15`, border: `1px solid ${stage.color}30` }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: stage.color, boxShadow: `0 0 5px ${stage.color}` }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stage.label}</span>
                      </div>
                    )}
                    {/* Stage change buttons */}
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {KANBAN_STAGES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => changeStage(detailRecipient.id, s.id)}
                          disabled={detailRecipient.stage === s.id}
                          style={{
                            background: detailRecipient.stage === s.id ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${detailRecipient.stage === s.id ? s.color + '50' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 5, padding: '3px 10px',
                            fontSize: 9, fontWeight: 700, color: detailRecipient.stage === s.id ? s.color : 'var(--muted)',
                            cursor: detailRecipient.stage === s.id ? 'default' : 'pointer',
                            fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.07em',
                            transition: 'all 0.12s',
                          }}
                          onMouseOver={e => { if (detailRecipient.stage !== s.id) { e.currentTarget.style.borderColor = s.color + '60'; e.currentTarget.style.color = s.color; } }}
                          onMouseOut={e => { if (detailRecipient.stage !== s.id) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--muted)'; } }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Email timeline */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                        Email History
                      </div>
                      {sends.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>No emails sent yet</div>
                      ) : sends.map((s: any) => (
                        <div key={s.id} style={{ marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 12px', borderLeft: `2px solid ${STATUS_COLOR[s.status] ?? '#64748B'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                              Step {s.step?.stepNumber ?? '?'} — {s.step?.subjectTemplate ?? ''}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: STATUS_COLOR[s.status] ?? 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', background: `${STATUS_COLOR[s.status] ?? '#64748B'}15`, padding: '2px 6px', borderRadius: 4 }}>
                              {s.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                            {s.status === 'sent' ? `Sent ${fmt(s.sentAt)}` : s.status === 'pending' ? `Scheduled ${fmt(s.scheduledAt)}` : s.status === 'cancelled' ? 'Cancelled — replied' : `Failed: ${s.error ?? 'unknown'}`}
                          </div>
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {s.opens > 0 ? (
                              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '2px 7px' }}>
                                👁 {s.opens}× · {fmt(s.lastOpenedAt)}
                              </span>
                            ) : s.status === 'sent' ? (
                              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--dim)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 7px' }}>
                                👁 not opened
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                          Replies
                        </div>
                        {replies.map((r: any) => (
                          <div key={r.id} style={{ marginBottom: 8, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 10, color: 'rgba(16,185,129,0.7)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{fmt(r.receivedAt)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.body || '(empty)'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
                      Added {fmt(detailRecipient.createdAt)} · step {detailRecipient.currentStep}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => deleteRecipient(detailRecipient.id)}
                      style={{
                        background: 'rgba(251,113,133,0.08)', color: '#FB7185',
                        border: '1px solid rgba(251,113,133,0.2)',
                        borderRadius: 7, padding: '8px 14px',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase' as const,
                      }}
                    >
                      Delete
                    </button>
                    {detailRecipient.stage === 'new' && (
                      <button
                        onClick={() => { sendNow(detailRecipient.id); setDetailRecipient(null); }}
                        disabled={sending === detailRecipient.id}
                        style={{ flex: 1, background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 7, padding: '8px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}
                      >
                        ▶ Send Now
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Settings dialog ──────────────────────────────────────────────── */}
      {showSettings && settingsDraft && (
        <div
          onClick={() => setShowSettings(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRadius: 16,
              padding: '24px 26px',
              width: 520,
              maxWidth: 'calc(100vw - 40px)',
              maxHeight: 'calc(100vh - 60px)',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Dialog header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  Campaign Settings
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 400, color: 'var(--text)', letterSpacing: '0.01em' }}>
                  {campaign.name}
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                  color: 'var(--dim)', fontSize: 14, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--dim)'; }}
              >
                ✕
              </button>
            </div>

            {/* Editable settings form */}
            <form onSubmit={saveSettings}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Identity */}
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                  Identity
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Campaign Name</label>
                    <input type="text" required value={settingsDraft.name}
                      onChange={e => setSettingsDraft(d => d ? { ...d, name: e.target.value } : d)}
                      style={iStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>From Name</label>
                    <input type="text" required value={settingsDraft.fromName}
                      onChange={e => setSettingsDraft(d => d ? { ...d, fromName: e.target.value } : d)}
                      style={iStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>From Email</label>
                  <input type="email" required value={settingsDraft.fromEmail}
                    onChange={e => setSettingsDraft(d => d ? { ...d, fromEmail: e.target.value } : d)}
                    style={iStyle}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Autosend API Key</label>
                  <input type="text" value={settingsDraft.unosendApiKey}
                    onChange={e => setSettingsDraft(d => d ? { ...d, unosendApiKey: e.target.value } : d)}
                    style={iStyle} placeholder="AS_..."
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                </div>

                {/* Send Window */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
                    Send Window
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Start Hour (0–23)</label>
                      <input type="number" min={0} max={23} required value={settingsDraft.sendWindowStart}
                        onChange={e => setSettingsDraft(d => d ? { ...d, sendWindowStart: Number(e.target.value) } : d)}
                        style={iStyle}
                        onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>19 = 7 PM</div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>End Hour (0–23)</label>
                      <input type="number" min={0} max={23} required value={settingsDraft.sendWindowEnd}
                        onChange={e => setSettingsDraft(d => d ? { ...d, sendWindowEnd: Number(e.target.value) } : d)}
                        style={iStyle}
                        onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>23 = 11 PM</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Active Days</label>
                    <input type="text" required value={settingsDraft.sendWindowDays}
                      onChange={e => setSettingsDraft(d => d ? { ...d, sendWindowDays: e.target.value } : d)}
                      style={iStyle} placeholder="Mon,Tue,Wed,Thu,Fri,Sat"
                      onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>Comma-separated: Mon,Tue,Wed,Thu,Fri,Sat,Sun</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Timezone</label>
                      <input type="text" required value={settingsDraft.tz}
                        onChange={e => setSettingsDraft(d => d ? { ...d, tz: e.target.value } : d)}
                        style={iStyle} placeholder="Asia/Kolkata"
                        onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Daily Cap</label>
                      <input type="number" min={1} required value={settingsDraft.dailyCap}
                        onChange={e => setSettingsDraft(d => d ? { ...d, dailyCap: Number(e.target.value) } : d)}
                        style={iStyle}
                        onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border-2)')} />
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>Max emails to send per day</div>
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="submit" disabled={savingSettings} style={{
                    flex: 1, background: savingSettings ? 'rgba(99,102,241,0.4)' : 'var(--indigo)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 0', fontSize: 13, fontWeight: 600,
                    cursor: savingSettings ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}>
                    {savingSettings ? 'Saving…' : 'Save Settings'}
                  </button>
                  <button type="button" onClick={() => setShowSettings(false)} style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                    padding: '10px 16px', fontSize: 13, fontWeight: 500,
                    color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
