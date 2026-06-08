'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCampaign() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', fromEmail: '', fromName: '', unosendApiKey: '',
    sendWindowStart: 19, sendWindowEnd: 23,
    sendWindowDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
    tz: 'Asia/Kolkata', dailyCap: 50,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed'); setSubmitting(false); return; }
    router.push(`/campaigns/${data.id}`);
  }

  const set = (key: keyof typeof form, val: string | number) =>
    setForm(f => ({ ...f, [key]: val }));

  const TextField = ({ k, label, placeholder = '' }: { k: keyof typeof form; label: string; placeholder?: string }) => (
    <div>
      <label className="block text-[#4a6a4a] text-[10px] tracking-[0.25em] uppercase mb-1">{label}</label>
      <input
        type="text"
        value={form[k] as string}
        onChange={e => set(k, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border border-[#2a3a2a] text-[#c8e6c8] px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#ffcc00] transition-colors placeholder:text-[#2a4a2a]"
        required
      />
    </div>
  );

  const NumberField = ({ k, label, min, max }: { k: keyof typeof form; label: string; min?: number; max?: number }) => (
    <div>
      <label className="block text-[#4a6a4a] text-[10px] tracking-[0.25em] uppercase mb-1">{label}</label>
      <input
        type="number"
        value={form[k] as number}
        min={min}
        max={max}
        onChange={e => set(k, Number(e.target.value))}
        className="w-full bg-transparent border border-[#2a3a2a] text-[#c8e6c8] px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#ffcc00] transition-colors"
        required
      />
    </div>
  );

  return (
    <main style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }} className="min-h-screen bg-[#0a0f0a] text-[#c8e6c8] p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <a href="/" className="text-[#4a6a4a] text-xs tracking-[0.2em] uppercase hover:text-[#ffcc00] transition-colors">← DISPATCH BOARD</a>
          <h1 className="text-2xl font-bold text-[#e8f5e8] mt-4">NEW CAMPAIGN</h1>
          <div className="w-12 h-0.5 bg-[#ffcc00] mt-2" />
        </div>

        {error && (
          <div className="border border-red-800 bg-red-950/30 text-red-400 px-4 py-3 text-sm mb-6">
            ✗ {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <TextField k="name" label="Campaign name" placeholder="OpenDirectory cold outreach" />
          <div className="grid grid-cols-2 gap-4">
            <TextField k="fromEmail" label="From email" placeholder="paras@opendirectory.dev" />
            <TextField k="fromName" label="From name" placeholder="Paras" />
          </div>
          <TextField k="unosendApiKey" label="Unosend API key" placeholder="un_..." />
          <div className="border-t border-[#1a2a1a] pt-5">
            <div className="text-[#4a6a4a] text-[10px] tracking-[0.25em] uppercase mb-4">SEND WINDOW</div>
            <div className="grid grid-cols-2 gap-4">
              <NumberField k="sendWindowStart" label="Start hour (0–23)" min={0} max={23} />
              <NumberField k="sendWindowEnd" label="End hour (0–23)" min={0} max={23} />
            </div>
            <div className="mt-4">
              <TextField k="sendWindowDays" label="Active days (comma-separated)" placeholder="Mon,Tue,Wed,Thu,Fri,Sat" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField k="tz" label="Timezone" placeholder="Asia/Kolkata" />
            <NumberField k="dailyCap" label="Daily cap (emails)" min={1} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full border border-[#ffcc00] text-[#ffcc00] py-3 text-xs tracking-[0.3em] uppercase font-bold hover:bg-[#ffcc00] hover:text-[#0a0f0a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? 'CREATING...' : 'CREATE CAMPAIGN'}
          </button>
        </form>
      </div>
    </main>
  );
}
