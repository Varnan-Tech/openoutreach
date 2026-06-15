'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FormState = {
  name: string; fromEmail: string; fromName: string; unosendApiKey: string;
  sendWindowStart: number; sendWindowEnd: number;
  sendWindowDays: string; tz: string; dailyCap: number;
};

const iStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--border-2)',
  borderRadius: 8, padding: '9px 12px',
  fontSize: 13, color: 'var(--text)',
  background: 'var(--surface-2)', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
};

const lStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--dim)',
  marginBottom: 6, display: 'block',
  textTransform: 'uppercase', letterSpacing: '0.07em',
};

function TF({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label style={lStyle}>{label}</label>
      <input
        type="text" value={value} placeholder={placeholder} required={required}
        onChange={e => onChange(e.target.value)}
        style={iStyle}
        onFocus={e => {
          e.target.style.borderColor = 'rgba(99,102,241,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border-2)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

function NF({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div>
      <label style={lStyle}>{label}</label>
      <input
        type="number" value={value} min={min} max={max} required
        onChange={e => onChange(Number(e.target.value))}
        style={iStyle}
        onFocus={e => {
          e.target.style.borderColor = 'rgba(99,102,241,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border-2)';
          e.target.style.boxShadow = 'none';
        }}
      />
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
    const trimmedEmail = form.fromEmail.trim();
    const payload = { ...form, fromEmail: trimmedEmail, fromDomain: trimmedEmail.split('@')[1] ?? '' };
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
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 52px)', padding: '36px 32px', fontFamily: 'var(--font-ui)' }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>

        <div style={{ marginBottom: 26 }}>
          <a href="/" style={{ fontSize: 12, color: 'var(--indigo)', textDecoration: 'none', fontWeight: 500 }}>← Campaigns</a>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400,
            color: 'var(--text)', margin: '10px 0 4px', letterSpacing: '0.01em',
          }}>
            New Campaign
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Set up a new outreach sequence</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--coral-pale)', border: '1px solid rgba(251,113,133,0.2)',
            color: 'var(--coral)', padding: '10px 14px', borderRadius: 8,
            fontSize: 13, marginBottom: 18,
          }}>
            {error}
          </div>
        )}

        <div style={{
          background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--border)', padding: '24px 26px',
        }}>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <TF label="Campaign name" value={form.name} onChange={v => set('name', v)}
                placeholder="OpenDirectory cold outreach" required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <TF label="From email" value={form.fromEmail} onChange={v => set('fromEmail', v)}
                  placeholder="paras@domain.com" required />
                <TF label="From name" value={form.fromName} onChange={v => set('fromName', v)}
                  placeholder="Paras" required />
              </div>

              <div>
                <TF label="Autosend API key (optional)" value={form.unosendApiKey} onChange={v => set('unosendApiKey', v)}
                  placeholder="AS_… (leave blank to use default from env)" />
                {!form.unosendApiKey && (
                  <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    ✓ Default key from <code style={{ color: 'var(--indigo)', background: 'rgba(99,102,241,0.08)', padding: '1px 5px', borderRadius: 4 }}>AUTOSEND_API_KEY</code> env will be used
                  </p>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: 'var(--font-mono)' }}>
                  Send Window
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <NF label="Start hour (0–23)" value={form.sendWindowStart} onChange={v => set('sendWindowStart', v)} min={0} max={23} />
                  <NF label="End hour (0–23)" value={form.sendWindowEnd} onChange={v => set('sendWindowEnd', v)} min={0} max={23} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <TF label="Active days" value={form.sendWindowDays} onChange={v => set('sendWindowDays', v)}
                    placeholder="Mon,Tue,Wed,Thu,Fri" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <TF label="Timezone" value={form.tz} onChange={v => set('tz', v)} placeholder="Asia/Kolkata" />
                <NF label="Daily cap" value={form.dailyCap} onChange={v => set('dailyCap', v)} min={1} />
              </div>

              <button
                type="submit" disabled={submitting}
                style={{
                  width: '100%', background: submitting ? 'rgba(99,102,241,0.4)' : 'var(--indigo)',
                  color: '#fff', border: 'none', borderRadius: 9,
                  padding: '12px 0', fontSize: 14, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  marginTop: 4, fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                }}
                onMouseOver={e => { if (!submitting) e.currentTarget.style.opacity = '0.85'; }}
                onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {submitting ? 'Creating…' : 'Create Campaign'}
              </button>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
