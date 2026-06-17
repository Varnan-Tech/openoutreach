# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the UI from a generic indigo/AI-purple aesthetic to a distinctive warm-accented dark theme with better visual hierarchy, cleaner cards, and no glow effects.

**Architecture:** CSS-variable-first. Task 1 updates `--accent` token which cascades; subsequent tasks replace hardcoded `rgba(99,102,241,...)` strings that CSS variables can't reach. No new dependencies.

**Tech Stack:** Next.js (App Router), React 19, Tailwind v4, CSS custom properties, Google Fonts (Outfit / Fraunces / DM Mono), inline styles via `style` prop.

**Design Decisions:**
- Primary accent: `#F97316` (warm orange) — replaces `#6366F1` indigo (banned AI purple/blue)
- Pale accent: `rgba(249,115,22,0.10)`
- Status colors stay semantic (amber=opened, emerald=replied, coral=bounced)
- No glow/boxShadow on accent buttons (kills the "neon AI" aesthetic)
- Kanban card names: switch from Fraunces serif → Outfit 600 (serif at 13px looks cluttered)
- Remove all emoji from UI: 📭 👁 — replace with text/SVG

**Verify command (run after every task):**
```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

---

### Task 1: Color system — add accent token + skeleton animation

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Update globals.css**

Replace the entire file with:

```css
@import "tailwindcss";

:root {
  /* Dark theme tokens — never pure black (#000), use dark gray per research */
  --bg:          #0F1117;
  --surface:     #161B27;
  --surface-2:   #1E2436;
  --border:      rgba(255,255,255,0.07);
  --border-2:    rgba(255,255,255,0.12);
  --text:        #E8EAF0;
  --muted:       rgba(232,234,240,0.5);
  --dim:         rgba(232,234,240,0.22);

  /* Primary action accent — warm orange, replaces AI-purple indigo */
  --accent:      #F97316;
  --accent-pale: rgba(249,115,22,0.10);

  /* Semantic status colors — do not use for UI chrome */
  --amber:       #F59E0B;  /* opened */
  --amber-pale:  rgba(245,158,11,0.1);
  --emerald:     #10B981;  /* replied */
  --emerald-pale:rgba(16,185,129,0.1);
  --coral:       #FB7185;  /* bounced */
  --coral-pale:  rgba(251,113,133,0.1);
  --violet:      #8B5CF6;  /* completed — semantic only */

  /* Font families — loaded by layout.tsx */
  --font-display: var(--font-fraunces, Georgia, serif);
  --font-mono:    var(--font-dm-mono, 'Courier New', monospace);
  --font-ui:      var(--font-outfit, system-ui, sans-serif);
}

@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--text);
}

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
}

/* Skeleton loader shimmer */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 6px;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add app/globals.css && git commit -m "design: replace indigo with warm orange accent, add skeleton animation"
```

---

### Task 2: Global header logotype redesign

**Files:**
- Modify: `app/layout.tsx`

The current header has an "O" badge with indigo background + glow shadow (classic AI aesthetic). Replace with a text logotype using Fraunces for "Open" and dim Outfit for "Outreach". Remove glow entirely.

- [ ] **Step 1: Replace the header in layout.tsx**

Replace lines 32–58 (the `<header>` element) with:

```tsx
        {/* Global topbar */}
        <header style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 400,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}>
              Open
            </span>
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--muted)",
              letterSpacing: "0.01em",
            }}>
              Outreach
            </span>
            <span style={{
              marginLeft: 8,
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "inline-block",
              flexShrink: 0,
            }} />
          </a>
        </header>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add app/layout.tsx && git commit -m "design: replace indigo logo badge with Fraunces wordmark logotype"
```

---

### Task 3: Campaign list page — list rows, skeleton loader, no emoji

**Files:**
- Modify: `app/page.tsx`

Changes:
1. Replace 2-col card grid → single-column list rows (more distinctive, better info scan)
2. Replace "Loading…" text → 3 skeleton rows
3. Replace emoji `📭` → typographic empty state
4. Fix hover: accent border-left instead of opacity change
5. Remove glow boxShadow from "+ New Campaign" button
6. Replace `var(--indigo)` → `var(--accent)` (eyebrow color, button bg, empty state CTA)

- [ ] **Step 1: Replace page.tsx entirely**

```tsx
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
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.opacity = '0.88';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.opacity = '1';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
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
                    (e.currentTarget as HTMLElement).style.borderLeftColor = 'var(--accent)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add app/page.tsx && git commit -m "design: campaign list — rows layout, skeleton loader, remove emoji/glow"
```

---

### Task 4: New campaign form — focus rings + label style

**Files:**
- Modify: `app/campaigns/new/page.tsx`

The focus ring currently uses `rgba(99,102,241,...)` (indigo). Replace with `rgba(249,115,22,...)` (orange accent). Two occurrences: `TF` and `NF` components.

- [ ] **Step 1: Update TF component focus handlers (lines 38–46)**

Find:
```tsx
        onFocus={e => {
          e.target.style.borderColor = 'rgba(99,102,241,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border-2)';
          e.target.style.boxShadow = 'none';
        }}
```

Replace with:
```tsx
        onFocus={e => {
          e.target.style.borderColor = 'rgba(249,115,22,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border-2)';
          e.target.style.boxShadow = 'none';
        }}
```

- [ ] **Step 2: Update NF component focus handlers (lines 63–71)**

Find:
```tsx
        onFocus={e => {
          e.target.style.borderColor = 'rgba(99,102,241,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border-2)';
          e.target.style.boxShadow = 'none';
        }}
```

Replace with:
```tsx
        onFocus={e => {
          e.target.style.borderColor = 'rgba(249,115,22,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border-2)';
          e.target.style.boxShadow = 'none';
        }}
```

Then find and update the submit button and any remaining `#6366F1` / `rgba(99,102,241,...)` values in the file. Search:
```bash
grep -n "6366F1\|99,102,241\|indigo" /Users/ksd/Desktop/Varnan_skills/openoutreach/app/campaigns/new/page.tsx
```

Replace every match with its orange equivalent: `#F97316` / `rgba(249,115,22,...)` / `var(--accent)`.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add app/campaigns/new/page.tsx && git commit -m "design: new campaign form — orange focus rings"
```

---

### Task 5: Campaign page — accent replacements in sub-header and stats bar

**Files:**
- Modify: `app/campaigns/[id]/page.tsx`

This is the largest file (1767 lines). This task covers accent color replacements in the sub-header area (lines 360–650) and removes glow effects from stat numbers and buttons.

- [ ] **Step 1: Find all indigo references to replace**

```bash
grep -n "6366F1\|99,102,241\|818CF8\|A5B4FC\|indigo" /Users/ksd/Desktop/Varnan_skills/openoutreach/app/campaigns/[id]/page.tsx
```

Note every line number returned.

- [ ] **Step 2: Sub-header — "+ Add Lead" button (lines ~448–458)**

Find:
```tsx
                background: showAddLead ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showAddLead ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}`,
```
and:
```tsx
                color: showAddLead ? '#818CF8' : 'var(--muted)',
```
and its hover handlers:
```tsx
              onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#818CF8'; }}
              onMouseOut={e => { if (!showAddLead) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted)'; } }}
```

Replace with:
```tsx
                background: showAddLead ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showAddLead ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.12)'}`,
```
and:
```tsx
                color: showAddLead ? 'var(--accent)' : 'var(--muted)',
```
and:
```tsx
              onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseOut={e => { if (!showAddLead) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted)'; } }}
```

- [ ] **Step 3: Sub-header — steps badge (line ~422)**

Find:
```tsx
                  background: '#6366F1', color: '#fff',
```

Replace with:
```tsx
                  background: 'var(--accent)', color: '#fff',
```

- [ ] **Step 4: Stats bar — "In Sequence" group (lines ~568–573)**

Find:
```tsx
          <div style={{ display: 'flex', gap: 1, background: 'rgba(99,102,241,0.08)', borderRadius: 9, padding: 3, border: '1px solid rgba(99,102,241,0.22)', flexShrink: 0 }}>
            <div style={{ padding: '7px 16px', borderRadius: 7, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#818CF8', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px #6366F155' }}>{String(counts.in_sequence || 0)}</div>
              <div style={{ fontSize: 9, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>In Seq</div>
```

Replace with:
```tsx
          <div style={{ display: 'flex', gap: 1, background: 'rgba(249,115,22,0.08)', borderRadius: 9, padding: 3, border: '1px solid rgba(249,115,22,0.22)', flexShrink: 0 }}>
            <div style={{ padding: '7px 16px', borderRadius: 7, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: 'var(--accent)', letterSpacing: '-0.03em', lineHeight: 1 }}>{String(counts.in_sequence || 0)}</div>
              <div style={{ fontSize: 9, color: 'rgba(249,115,22,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>In Seq</div>
```

- [ ] **Step 5: Stats bar — remove textShadow from all other stat numbers**

Find (opened stat, line ~582):
```tsx
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#FBB740', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px #F59E0B55' }}>{value}</div>
```

Replace with:
```tsx
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#FBB740', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
```

Find (replied stat, line ~595):
```tsx
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#34D399', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px #10B98155' }}>{value}</div>
```

Replace with:
```tsx
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#34D399', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
```

Find (bounced stat, line ~604):
```tsx
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#FB7185', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 16px #FB718555' }}>{String(counts.bounced || 0)}</div>
```

Replace with:
```tsx
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 300, color: '#FB7185', letterSpacing: '-0.03em', lineHeight: 1 }}>{String(counts.bounced || 0)}</div>
```

- [ ] **Step 6: Sub-header — Launch button glow removal (line ~538)**

Find:
```tsx
                  boxShadow: launching ? 'none' : '0 0 12px rgba(16,185,129,0.15)',
```

Delete that line entirely (remove the `boxShadow` property).

- [ ] **Step 7: Kanban board — Export CSV hover (line ~643–644)**

Find:
```tsx
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#818CF8'; }}
```

Replace with:
```tsx
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; e.currentTarget.style.color = 'var(--accent)'; }}
```

- [ ] **Step 8: Selection bar accent (lines ~652–657)**

Find:
```tsx
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
```
and:
```tsx
                <span style={{ fontSize: 11, fontWeight: 600, color: '#818CF8', fontFamily: 'var(--font-mono)' }}>
```

Replace with:
```tsx
                background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
```
and:
```tsx
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
```

- [ ] **Step 9: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add "app/campaigns/[id]/page.tsx" && git commit -m "design: campaign page — replace indigo accent, remove stat glows"
```

---

### Task 6: Kanban cards — typography + emoji removal + Send Now button

**Files:**
- Modify: `app/campaigns/[id]/page.tsx` (lines 755–865 approximately)

Changes:
1. Card name: switch from `var(--font-display)` (Fraunces serif) → `var(--font-ui)` Outfit 600 (serif at 13px looks cluttered in tight card)
2. Remove `👁` emoji from the opens badge — replace with plain text
3. "✓ Done" badge: change violet → muted (completed is terminal, not highlighted)
4. Checkbox selection: replace indigo colors with accent orange
5. "Send Now" button: indigo → accent orange

- [ ] **Step 1: Card name — replace font-display with font-ui (line ~796–801)**

Find:
```tsx
                            <div style={{
                              fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 400,
                              color: 'var(--text)', marginBottom: company ? 2 : 4, lineHeight: 1.3,
                            }}>
                              {displayName}
                            </div>
```

Replace with:
```tsx
                            <div style={{
                              fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                              color: 'var(--text)', marginBottom: company ? 2 : 4, lineHeight: 1.3,
                              letterSpacing: '-0.01em',
                            }}>
                              {displayName}
                            </div>
```

- [ ] **Step 2: Remove 👁 emoji — replace with text label (line ~820–827)**

Find:
```tsx
                            {r._opens > 0 && r.stage !== 'opened' && (
                              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '2px 7px' }}>
                                <span style={{ fontSize: 9 }}>👁</span>
                                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.05em' }}>
                                  {r._opens}× opened
                                </span>
                              </div>
                            )}
```

Replace with:
```tsx
                            {r._opens > 0 && r.stage !== 'opened' && (
                              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '2px 7px' }}>
                                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.05em' }}>
                                  {r._opens}× opened
                                </span>
                              </div>
                            )}
```

- [ ] **Step 3: "✓ Done" badge — mute the violet (line ~828–832)**

Find:
```tsx
                            {r.stage === 'completed' && (
                              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 4, padding: '2px 7px' }}>
                                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#8B5CF6', letterSpacing: '0.05em' }}>✓ Done</span>
                              </div>
                            )}
```

Replace with:
```tsx
                            {r.stage === 'completed' && (
                              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 7px' }}>
                                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em' }}>done</span>
                              </div>
                            )}
```

- [ ] **Step 4: Checkbox selection — indigo → accent (lines ~785–794)**

Find:
```tsx
                                  border: `1px solid ${selectedIds.has(r.id) ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.15)'}`,
                                  background: selectedIds.has(r.id) ? 'rgba(99,102,241,0.3)' : 'transparent',
```
and:
```tsx
                                  fontSize: 9, color: '#818CF8',
```

Replace with:
```tsx
                                  border: `1px solid ${selectedIds.has(r.id) ? 'rgba(249,115,22,0.7)' : 'rgba(255,255,255,0.15)'}`,
                                  background: selectedIds.has(r.id) ? 'rgba(249,115,22,0.3)' : 'transparent',
```
and:
```tsx
                                  fontSize: 9, color: 'var(--accent)',
```

- [ ] **Step 5: "Send Now" button — indigo → accent (lines ~838–848)**

Find:
```tsx
                                  background: 'rgba(99,102,241,0.1)',
                                  color: '#6366F1',
                                  border: '1px solid rgba(99,102,241,0.2)',
```

Replace with:
```tsx
                                  background: 'rgba(249,115,22,0.1)',
                                  color: 'var(--accent)',
                                  border: '1px solid rgba(249,115,22,0.2)',
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add "app/campaigns/[id]/page.tsx" && git commit -m "design: kanban cards — outfit 600 names, remove emoji, accent Send Now btn"
```

---

### Task 7: Sweep remaining indigo references in campaign page

**Files:**
- Modify: `app/campaigns/[id]/page.tsx`

Catch any remaining hardcoded indigo values not covered by Tasks 5–6 (modals, step editors, settings form, detail panel, form focus rings).

- [ ] **Step 1: Search for remaining references**

```bash
grep -n "6366F1\|99,102,241\|818CF8\|A5B4FC\|--indigo" /Users/ksd/Desktop/Varnan_skills/openoutreach/app/campaigns/[id]/page.tsx
```

- [ ] **Step 2: Replace each match**

For every `rgba(99,102,241, ...)` value found:
- `rgba(99,102,241,0.5)` → `rgba(249,115,22,0.5)` (focus borders)
- `rgba(99,102,241,0.08)` → `rgba(249,115,22,0.08)` (focus shadows)
- `rgba(99,102,241,0.1)` → `rgba(249,115,22,0.1)` (subtle bg tints)
- `rgba(99,102,241,0.2)` → `rgba(249,115,22,0.2)` (borders)
- `rgba(99,102,241,0.3)` → `rgba(249,115,22,0.3)`
- `rgba(99,102,241,0.4)` → `rgba(249,115,22,0.4)`
- `#6366F1` → `var(--accent)` or `#F97316`
- `#818CF8` → `var(--accent)` or `#FB923C`

The `iStyle` focus handlers (used throughout modals and step editor, declared at line ~24) should also be updated — find `rgba(99,102,241,...)` in that object.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add "app/campaigns/[id]/page.tsx" && git commit -m "design: sweep remaining indigo refs — modals, step editor, detail panel"
```

---

## Self-Review

**Spec coverage check:**
- [x] Primary accent color replaced (indigo → orange) — Tasks 1, 5, 6, 7
- [x] Glow effects removed (logo badge, stat numbers, launch button) — Tasks 2, 5
- [x] Emoji removed from UI (📭 📌 👁) — Tasks 3, 6
- [x] Skeleton loader replacing text loading state — Task 3
- [x] Campaign list redesigned (rows vs grid cards) — Task 3
- [x] Kanban card name typography fixed (serif → Outfit 600) — Task 6
- [x] Focus rings updated in all 3 pages — Tasks 4, 7
- [x] "Done" badge de-emphasized — Task 6

**Placeholder scan:** No TBD, TODO, or "implement later" patterns present.

**Type consistency:** All JSX style props use `React.CSSProperties`-compatible values. The `iStyle` object at campaign page line ~24 is a shared constant — Task 7 must update it since it applies across all inline inputs in modals.
