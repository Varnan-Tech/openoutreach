'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FormState = {
  name: string; fromEmail: string; fromName: string; unosendApiKey: string;
  sendWindowStart: number; sendWindowEnd: number;
  sendWindowDays: string; tz: string; dailyCap: number;
};

const inputCls = "w-full bg-white border border-slate-300 text-slate-900 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400 transition";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

// Defined OUTSIDE component — keeps component reference stable across renders
// so React won't remount inputs on every keystroke.
function TF({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} className={inputCls} />
    </div>
  );
}

function NF({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} required className={inputCls} />
    </div>
  );
}

export default function NewCampaign() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: '', fromEmail: '', fromName: '', unosendApiKey: '',
    sendWindowStart: 9, sendWindowEnd: 17,
    sendWindowDays: 'Mon,Tue,Wed,Thu,Fri',
    tz: 'Asia/Kolkata', dailyCap: 50,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const payload = { ...form, fromDomain: form.fromEmail.split('@')[1] ?? '' };
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to create campaign'); setSubmitting(false); return; }
    router.push(`/campaigns/${data.id}`);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Dashboard</a>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">New Campaign</h1>
          <p className="text-slate-500 text-sm mt-1">Set up a new outreach sequence</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-5">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={submit} className="space-y-5">
            <TF label="Campaign name" value={form.name} onChange={v => set('name', v)}
              placeholder="OpenDirectory cold outreach" required />

            <div className="grid grid-cols-2 gap-4">
              <TF label="From email" value={form.fromEmail} onChange={v => set('fromEmail', v)}
                placeholder="paras@opendirectory.dev" required />
              <TF label="From name" value={form.fromName} onChange={v => set('fromName', v)}
                placeholder="Paras" required />
            </div>

            <TF label="Autosend API key" value={form.unosendApiKey} onChange={v => set('unosendApiKey', v)}
              placeholder="AS_..." required />

            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">Send Window</p>
              <div className="grid grid-cols-2 gap-4">
                <NF label="Start hour (0–23)" value={form.sendWindowStart} onChange={v => set('sendWindowStart', v)} min={0} max={23} />
                <NF label="End hour (0–23)" value={form.sendWindowEnd} onChange={v => set('sendWindowEnd', v)} min={0} max={23} />
              </div>
              <div className="mt-4">
                <TF label="Active days (comma-separated)" value={form.sendWindowDays} onChange={v => set('sendWindowDays', v)}
                  placeholder="Mon,Tue,Wed,Thu,Fri" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TF label="Timezone" value={form.tz} onChange={v => set('tz', v)} placeholder="Asia/Kolkata" />
              <NF label="Daily cap (emails)" value={form.dailyCap} onChange={v => set('dailyCap', v)} min={1} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating…' : 'Create Campaign'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
