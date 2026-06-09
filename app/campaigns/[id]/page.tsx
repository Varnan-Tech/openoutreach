'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  active:    { label: 'Active',    color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  paused:    { label: 'Paused',    color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  completed: { label: 'Completed', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
};

const STAGES = ['new', 'in_sequence', 'replied', 'bounced', 'completed'] as const;
const STAGE_LABEL: Record<string, string> = {
  new: 'New', in_sequence: 'In Seq', replied: 'Replied', bounced: 'Bounced', completed: 'Done',
};
const STAGE_COLOR: Record<string, string> = {
  new: '#475569', in_sequence: '#1D4ED8', replied: '#047857', bounced: '#B91C1C', completed: '#6D28D9',
};

type StepDraft = { subject: string; bodyText: string; delayDays: number };

const inputCls = "w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400 transition";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'error'>('ok');
  const [launching, setLaunching] = useState(false);
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
        stepNumber,
        delayDaysFromPrevious: draft.delayDays,
        subjectTemplate: draft.subject,
        bodyHtmlTemplate: html,
        bodyTextTemplate: draft.bodyText,
      }),
    });
    if (res.ok) {
      setDraft({ subject: '', bodyText: '', delayDays: 0 });
      setShowAddStep(false);
      reload();
    } else {
      flash('Failed to add step', 'error');
    }
    setAddingStep(false);
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Delete this step? This cannot be undone.')) return;
    const res = await fetch(`/api/campaigns/${id}/steps?stepId=${stepId}`, { method: 'DELETE' });
    if (res.ok) reload();
    else flash('Failed to delete step', 'error');
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
    if (res.ok) { flash(`Uploaded — ${data.inserted} recipients added, ${data.skipped} skipped`, 'ok'); reload(); }
    else { flash(data.error ?? 'Upload failed', 'error'); }
    setUploading(false);
  }

  if (!campaign) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Loading…</p>
    </main>
  );

  const counts: Record<string, number> = {};
  STAGES.forEach(s => { counts[s] = recipients.filter(r => r.stage === s).length; });
  const sc = STATUS_CFG[campaign.status] ?? STATUS_CFG.draft;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Dashboard</a>
          <div className="flex items-start justify-between mt-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">{campaign.fromEmail}</p>
              <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}
              >
                {sc.label}
              </span>
              {campaign.status === 'draft' && (
                <button
                  onClick={launch}
                  disabled={launching}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {launching ? 'Launching…' : '▶ Launch'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Flash message */}
        {msg && (
          <div
            className="px-4 py-3 rounded-lg text-sm font-medium border"
            style={{
              color: msgType === 'ok' ? '#047857' : '#B91C1C',
              background: msgType === 'ok' ? '#ECFDF5' : '#FEF2F2',
              borderColor: msgType === 'ok' ? '#A7F3D0' : '#FECACA',
            }}
          >
            {msg}
          </div>
        )}

        {/* Stage counters */}
        <div className="grid grid-cols-5 gap-3">
          {STAGES.map(s => (
            <div key={s} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div
                className="text-3xl font-bold tabular-nums mb-1"
                style={{ color: counts[s] > 0 ? STAGE_COLOR[s] : '#CBD5E1' }}
              >
                {counts[s] ?? 0}
              </div>
              <div className="text-xs text-slate-400 font-medium">{STAGE_LABEL[s]}</div>
            </div>
          ))}
        </div>

        {/* Campaign details */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Send Window</p>
            <p className="text-slate-800 font-semibold">{campaign.sendWindowStart}:00 – {campaign.sendWindowEnd}:00</p>
            <p className="text-slate-400 text-sm mt-0.5">{campaign.sendWindowDays}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Daily Cap</p>
            <p className="text-slate-800 font-bold text-2xl tabular-nums">{campaign.dailyCap}</p>
            <p className="text-slate-400 text-sm mt-0.5">emails / day</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Timezone</p>
            <p className="text-slate-800 font-semibold">{campaign.tz}</p>
            <p className="text-slate-400 text-sm mt-0.5">{steps.length} step{steps.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Sequence Steps */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Sequence Steps</h2>
            {!showAddStep && (
              <button
                onClick={() => setShowAddStep(true)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                + Add Step
              </button>
            )}
          </div>

          {steps.length === 0 && !showAddStep && (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              No steps yet — add your first email step above
            </div>
          )}

          {steps.map(step => (
            <div key={step.id} className="px-5 py-4 border-b border-slate-100 last:border-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                  {step.stepNumber}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{step.subjectTemplate}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {step.delayDaysFromPrevious === 0 ? 'Send immediately' : `Wait ${step.delayDaysFromPrevious} day${step.delayDaysFromPrevious !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteStep(step.id)}
                className="text-slate-300 hover:text-red-500 transition-colors text-sm shrink-0"
                title="Delete step"
              >
                ✕
              </button>
            </div>
          ))}

          {showAddStep && (
            <form onSubmit={addStep} className="px-5 py-5 bg-slate-50 border-t border-slate-100 space-y-4">
              <p className="text-sm font-semibold text-slate-700">
                Step {(steps[steps.length - 1]?.stepNumber ?? 0) + 1}
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Subject template</label>
                  <input
                    type="text" required className={inputCls} placeholder="Hey {{first_name}}!"
                    value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Delay (days)</label>
                  <input
                    type="number" min={0} className={inputCls}
                    value={draft.delayDays} onChange={e => setDraft(d => ({ ...d, delayDays: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email body (plain text — use {`{{first_name}}`} etc.)</label>
                <textarea
                  required rows={6} className={inputCls + ' resize-none'} placeholder={"Hi {{first_name}},\n\nYour message here...\n\nBest,\nYour name"}
                  value={draft.bodyText} onChange={e => setDraft(d => ({ ...d, bodyText: e.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit" disabled={addingStep}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {addingStep ? 'Adding…' : 'Add Step'}
                </button>
                <button
                  type="button" onClick={() => setShowAddStep(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* CSV Upload */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Upload Recipients</h2>
            <p className="text-xs text-slate-400 mt-0.5">CSV must include an <code className="bg-slate-100 px-1 rounded">email</code> column. Extra columns become template variables.</p>
          </div>
          <div className="px-5 py-5">
            <input
              ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadCSV(f); e.target.value = ''; }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 border-2 border-dashed border-slate-300 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 px-5 py-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 w-full justify-center"
            >
              {uploading ? 'Uploading…' : '↑ Click to upload CSV'}
            </button>
          </div>
        </div>

        {/* Recipients table */}
        {recipients.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Recipients ({recipients.length})</h2>
            </div>
            <div className="grid grid-cols-[1fr_100px_60px] text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-2.5 bg-slate-50 border-b border-slate-100">
              <span>Email</span>
              <span>Stage</span>
              <span>Step</span>
            </div>
            {recipients.slice(0, 100).map(r => (
              <div key={r.id} className="grid grid-cols-[1fr_100px_60px] items-center px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <span className="text-sm text-slate-700 truncate">{r.email}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: STAGE_COLOR[r.stage] ?? '#94A3B8' }}
                >
                  {STAGE_LABEL[r.stage] ?? r.stage}
                </span>
                <span className="text-slate-400 tabular-nums text-sm">{r.currentStep || '—'}</span>
              </div>
            ))}
            {recipients.length > 100 && (
              <div className="px-5 py-3 text-slate-400 text-sm">+ {recipients.length - 100} more</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
