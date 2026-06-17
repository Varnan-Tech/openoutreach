# Light Mode Redesign — Vercel-Inspired

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch openoutreach from dark theme with orange accent to light-mode Vercel-inspired design: near-white canvas, ink-black primary, Inter sans-serif, hairline borders, no colored accent chrome.

**Architecture:** CSS-variable-first. globals.css overhaul cascades ~70% of changes automatically. Remaining tasks fix hardcoded `rgba(255,255,255,...)` values (designed for dark surfaces) and swap the font stack. No new npm packages — Inter is available via `next/font/google`.

**Design reference:** `openoutreach/DESIGN.md` — Vercel's light-mode design system.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, CSS custom properties, inline `style` props.

**Verify command (run after every task):**
```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

---

## Design Token Mapping

| Old (dark) | New (light) | Token |
|---|---|---|
| `#0F1117` (bg) | `#fafafa` | canvas-soft |
| `#161B27` (surface) | `#ffffff` | canvas |
| `#1E2436` (surface-2) | `#f5f5f5` | canvas-soft-2 |
| `rgba(255,255,255,0.07)` (border) | `#ebebeb` | hairline |
| `rgba(255,255,255,0.12)` (border-2) | `#a1a1a1` | hairline-strong |
| `#E8EAF0` (text) | `#171717` | ink |
| `rgba(232,234,240,0.5)` (muted) | `#888888` | mute |
| `rgba(232,234,240,0.22)` (dim) | `#a1a1a1` | hairline-strong |
| `#F97316` (accent) | `#171717` | ink primary |
| Outfit / Fraunces | Inter 400/500/600 | geometric sans |
| DM Mono | DM Mono (keep) | mono |

## rgba(255,255,255,...) → rgba(0,0,0,...) mapping (dark→light surfaces)

| Find | Replace | Semantic |
|---|---|---|
| `rgba(255,255,255,0.02)` | `rgba(0,0,0,0.02)` | barely-there tint |
| `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.03)` | subtle tint |
| `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` | ghost button bg |
| `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.03)` | stat card bg |
| `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.04)` | card inner bg |
| `rgba(255,255,255,0.07)` | `var(--border)` | hairline border |
| `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` | medium tint |
| `rgba(255,255,255,0.09)` | `rgba(0,0,0,0.06)` | active button bg |
| `rgba(255,255,255,0.1)` | `var(--border)` | border |
| `rgba(255,255,255,0.11)` | `var(--border)` | card border |
| `rgba(255,255,255,0.12)` | `var(--border)` | button border |
| `rgba(255,255,255,0.15)` | `rgba(0,0,0,0.12)` | stronger border |

---

### Task 1: globals.css — light palette overhaul

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace entire globals.css**

```css
@import "tailwindcss";

:root {
  /* Light theme — Vercel-inspired canvas/ink system */
  --bg:        #fafafa;
  --surface:   #ffffff;
  --surface-2: #f5f5f5;
  --border:    #ebebeb;
  --border-2:  #a1a1a1;
  --text:      #171717;
  --body:      #4d4d4d;
  --muted:     #888888;
  --dim:       #a1a1a1;

  /* Primary action — ink black (no colored accent) */
  --accent:      #171717;
  --accent-pale: rgba(23,23,23,0.06);
  --on-accent:   #ffffff;

  /* Semantic status colors — functional only, not UI chrome */
  --amber:       #F59E0B;
  --amber-pale:  rgba(245,158,11,0.08);
  --emerald:     #10B981;
  --emerald-pale:rgba(16,185,129,0.08);
  --coral:       #ee0000;
  --coral-pale:  rgba(238,0,0,0.08);
  --violet:      #8B5CF6;

  /* Font families — loaded by layout.tsx */
  --font-display: var(--font-inter, Inter, system-ui, sans-serif);
  --font-mono:    var(--font-dm-mono, 'Courier New', monospace);
  --font-ui:      var(--font-inter, Inter, system-ui, sans-serif);
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
  scrollbar-color: rgba(0,0,0,0.12) transparent;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.12);
  border-radius: 3px;
}

/* Skeleton loader shimmer */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton {
  background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.07) 50%, rgba(0,0,0,0.04) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 6px;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add app/globals.css && git commit -m "design: light mode palette — canvas/ink system, Inter font vars"
```

---

### Task 2: layout.tsx — Inter font + white header

**Files:**
- Modify: `app/layout.tsx`

Replace Outfit + Fraunces with Inter. DM_Mono stays. Update header to white background.

- [ ] **Step 1: Replace layout.tsx entirely**

```tsx
import type { Metadata } from "next";
import { Inter, DM_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "OpenOutreach",
  description: "Multi-campaign cold-email platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable} h-full antialiased`}>
      <body style={{ minHeight: "100vh" }}>
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
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 1 }}>
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}>
              Open
            </span>
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: 15,
              fontWeight: 400,
              color: "var(--muted)",
              letterSpacing: "-0.01em",
            }}>
              Outreach
            </span>
            <span style={{
              marginLeft: 6,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "inline-block",
              flexShrink: 0,
            }} />
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add app/layout.tsx && git commit -m "design: swap to Inter font, white header, ink logotype"
```

---

### Task 3: page.tsx — campaign list for light mode

**Files:**
- Modify: `app/page.tsx`

Key changes:
1. `STATUS.draft.text` was `'rgba(232,234,240,0.4)'` (invisible on light) → `'#888888'`
2. STATUS backgrounds use higher contrast
3. Campaign name font: already `var(--font-ui)` (good), h1 uses `var(--font-display)` → change to Inter weight 600 with tight tracking
4. SkeletonRow: already uses `.skeleton` class (updated in globals.css)
5. Hover state: `'rgba(255,255,255,0.02)'` on card → `'rgba(0,0,0,0.02)'`

- [ ] **Step 1: Replace page.tsx entirely**

```tsx
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
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 52px)', padding: '36px 32px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

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
              Your outreach campaigns
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add app/page.tsx && git commit -m "design: campaign list — light mode, ink CTA, mono eyebrow"
```

---

### Task 4: campaigns/new/page.tsx — light mode form

**Files:**
- Modify: `app/campaigns/new/page.tsx`

Light mode changes:
1. `iStyle` input: `background: 'var(--surface-2)'` → `background: 'var(--surface)'`, border stays `var(--border-2)` (which is now `#a1a1a1` via CSS var)
2. `lStyle` label: color was `var(--dim)` (now `#a1a1a1`) — good but could use `var(--muted)` (`#888888`) for subtlety
3. Focus ring: `rgba(249,115,22,...)` → `rgba(23,23,23,...)` (ink focus)
4. Submit button: any orange → black

- [ ] **Step 1: Read the current file**

Read `app/campaigns/new/page.tsx` to see the full current state.

- [ ] **Step 2: Update iStyle**

Find:
```tsx
const iStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--border-2)',
  borderRadius: 8, padding: '9px 12px',
  fontSize: 13, color: 'var(--text)',
  background: 'var(--surface-2)', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
};
```
Replace with:
```tsx
const iStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--border)',
  borderRadius: 6, padding: '8px 12px',
  fontSize: 13, color: 'var(--text)',
  background: 'var(--surface)', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
};
```

- [ ] **Step 3: Update lStyle**

Find:
```tsx
const lStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--dim)',
  marginBottom: 6, display: 'block',
  textTransform: 'uppercase', letterSpacing: '0.07em',
};
```
Replace with:
```tsx
const lStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--body)',
  marginBottom: 6, display: 'block',
  letterSpacing: '-0.01em',
};
```

- [ ] **Step 4: Replace orange focus rings with ink focus**

Find (in TF component):
```tsx
        onFocus={e => {
          e.target.style.borderColor = 'rgba(249,115,22,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)';
        }}
```
Replace with:
```tsx
        onFocus={e => {
          e.target.style.borderColor = 'rgba(23,23,23,0.4)';
          e.target.style.boxShadow = '0 0 0 3px rgba(23,23,23,0.06)';
        }}
```

Find (in NF component):
```tsx
        onFocus={e => {
          e.target.style.borderColor = 'rgba(249,115,22,0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)';
        }}
```
Replace with:
```tsx
        onFocus={e => {
          e.target.style.borderColor = 'rgba(23,23,23,0.4)';
          e.target.style.boxShadow = '0 0 0 3px rgba(23,23,23,0.06)';
        }}
```

- [ ] **Step 5: Find any remaining orange/accent refs**

```bash
grep -n "249,115,22\|F97316\|var(--accent)" "/Users/ksd/Desktop/Varnan_skills/openoutreach/app/campaigns/new/page.tsx"
```

Replace any `var(--accent)` usage on submit buttons — they now use the new ink `#171717` via the CSS variable (no change needed since CSS var auto-updates).

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add app/campaigns/new/page.tsx && git commit -m "design: new campaign form — light mode inputs, ink focus rings"
```

---

### Task 5: campaigns/[id]/page.tsx — rgba(255→0) replacements + light mode fixes

**Files:**
- Modify: `app/campaigns/[id]/page.tsx`

This is the largest change. Use sed for bulk replacements, then targeted edits for specific components.

**IMPORTANT:** The file path contains brackets. Always quote it: `"/Users/ksd/Desktop/Varnan_skills/openoutreach/app/campaigns/[id]/page.tsx"`

- [ ] **Step 1: Run bulk rgba replacements via sed**

```bash
FILE="/Users/ksd/Desktop/Varnan_skills/openoutreach/app/campaigns/[id]/page.tsx"

# Ghost button bg
sed -i '' "s/rgba(255,255,255,0\.04)/rgba(0,0,0,0.04)/g" "$FILE"

# Active button bg + light tint
sed -i '' "s/rgba(255,255,255,0\.09)/rgba(0,0,0,0.06)/g" "$FILE"

# Card inner bg  
sed -i '' "s/rgba(255,255,255,0\.06)/rgba(0,0,0,0.04)/g" "$FILE"

# Subtle tints
sed -i '' "s/rgba(255,255,255,0\.05)/rgba(0,0,0,0.03)/g" "$FILE"
sed -i '' "s/rgba(255,255,255,0\.03)/rgba(0,0,0,0.03)/g" "$FILE"
sed -i '' "s/rgba(255,255,255,0\.02)/rgba(0,0,0,0.02)/g" "$FILE"

# Borders → var(--border)
sed -i '' "s/rgba(255,255,255,0\.11)/var(--border)/g" "$FILE"
sed -i '' "s/rgba(255,255,255,0\.12)/var(--border)/g" "$FILE"
sed -i '' "s/rgba(255,255,255,0\.1)/var(--border)/g" "$FILE"

# Stronger borders
sed -i '' "s/rgba(255,255,255,0\.15)/rgba(0,0,0,0.12)/g" "$FILE"
sed -i '' "s/rgba(255,255,255,0\.07)/rgba(0,0,0,0.06)/g" "$FILE"
sed -i '' "s/rgba(255,255,255,0\.08)/rgba(0,0,0,0.06)/g" "$FILE"
```

- [ ] **Step 2: Verify no rgba(255,255,255,...) remain**

```bash
grep -n "rgba(255,255,255" "/Users/ksd/Desktop/Varnan_skills/openoutreach/app/campaigns/[id]/page.tsx"
```

Expected: zero matches (or any that remain should be intentionally white overlays — review each one).

- [ ] **Step 3: Fix stats bar "In Sequence" group — orange → ink**

Find (stats bar, around line 568):
```tsx
background: 'rgba(249,115,22,0.08)', borderRadius: 9, padding: 3, border: '1px solid rgba(249,115,22,0.22)'
```
Replace with:
```tsx
background: 'rgba(0,0,0,0.04)', borderRadius: 9, padding: 3, border: '1px solid var(--border)'
```

Find the In Seq number color:
```tsx
color: 'var(--accent)', letterSpacing: '-0.03em', lineHeight: 1
```
Replace with:
```tsx
color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1
```

Find the In Seq label color:
```tsx
color: 'rgba(249,115,22,0.7)',
```
Replace with:
```tsx
color: 'var(--muted)',
```

- [ ] **Step 4: Fix selection bar — orange → ink**

Find (around line 652):
```tsx
background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
```
Replace with:
```tsx
background: 'rgba(0,0,0,0.04)', border: '1px solid var(--border)',
```

Find "X selected" text color:
```tsx
color: 'var(--accent)',
```
(in the selectedIds span inside selection bar)
Replace with:
```tsx
color: 'var(--text)',
```

- [ ] **Step 5: Fix "+ Add Lead" button — orange active state → neutral**

Find (around line 448):
```tsx
background: showAddLead ? 'rgba(249,115,22,0.12)' : 'rgba(0,0,0,0.04)',
border: `1px solid ${showAddLead ? 'rgba(249,115,22,0.35)' : 'var(--border)'}`,
```
and:
```tsx
color: showAddLead ? 'var(--accent)' : 'var(--muted)',
```
and hover handlers with `'rgba(249,115,22,0.35)'` and `'var(--accent)'`.

Replace with:
```tsx
background: showAddLead ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.04)',
border: `1px solid ${showAddLead ? 'var(--border-2)' : 'var(--border)'}`,
```
and:
```tsx
color: showAddLead ? 'var(--text)' : 'var(--muted)',
```
and hover handlers: `'var(--border-2)'` and `'var(--text)'`.

- [ ] **Step 6: Fix steps badge — orange → ink**

Find:
```tsx
background: 'var(--accent)', color: '#fff',
```
(the steps count badge in the "Email Template & Follow-up" button)
Replace with:
```tsx
background: 'var(--text)', color: '#fff',
```

- [ ] **Step 7: Fix Send Now button — orange → ink**

Find:
```tsx
background: 'rgba(249,115,22,0.1)',
color: 'var(--accent)',
border: '1px solid rgba(249,115,22,0.2)',
```
Replace with:
```tsx
background: 'rgba(0,0,0,0.06)',
color: 'var(--text)',
border: '1px solid var(--border)',
```

- [ ] **Step 8: Fix checkbox selection — orange → ink**

Find:
```tsx
border: `1px solid ${selectedIds.has(r.id) ? 'rgba(249,115,22,0.7)' : 'rgba(0,0,0,0.12)'}`,
background: selectedIds.has(r.id) ? 'rgba(249,115,22,0.3)' : 'transparent',
```
and:
```tsx
fontSize: 9, color: 'var(--accent)',
```
Replace with:
```tsx
border: `1px solid ${selectedIds.has(r.id) ? 'var(--text)' : 'var(--border-2)'}`,
background: selectedIds.has(r.id) ? 'rgba(0,0,0,0.1)' : 'transparent',
```
and:
```tsx
fontSize: 9, color: 'var(--text)',
```

- [ ] **Step 9: Fix campaign sub-header name — font-display → font-ui**

Find (around line 382-387):
```tsx
              fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 400,
              color: 'var(--text)', margin: 0, letterSpacing: '0.01em',
```
Replace with:
```tsx
              fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
              color: 'var(--text)', margin: 0, letterSpacing: '-0.02em',
```

- [ ] **Step 10: Fix kanban card hover — was col.color tint, now neutral**

Find (around line 771-776):
```tsx
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = `${col.color}70`;
                              e.currentTarget.style.background = `${col.color}12`;
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)';
                              e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                            }}
```
Replace with:
```tsx
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = 'var(--border-2)';
                              e.currentTarget.style.background = 'var(--surface-2)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.background = 'var(--surface)';
                            }}
```

Also update the base card style (around line 763-764):
```tsx
                              background: 'rgba(0,0,0,0.04)',
                              border: '1px solid rgba(0,0,0,0.04)',
```
(these were the rgba(255,255,255,...) values replaced by sed, but they should be `var(--surface)` and `var(--border)`)
Replace with:
```tsx
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
```

- [ ] **Step 11: TypeScript check**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

- [ ] **Step 12: Commit**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && git add "app/campaigns/[id]/page.tsx" && git commit -m "design: campaign page — full light mode, ink primary, hairline borders"
```

---

## Self-Review

**Spec coverage:**
- [x] Light canvas/ink palette — Task 1
- [x] Inter font replaces Outfit/Fraunces — Task 2
- [x] White header — Task 2
- [x] Campaign list light mode — Task 3
- [x] Draft badge text visible on light bg — Task 3
- [x] Form inputs for light mode — Task 4
- [x] 36 rgba(255,255,255,...) instances replaced — Task 5
- [x] In Sequence stats group → neutral ink — Task 5
- [x] Selection bar → neutral — Task 5
- [x] Send Now button → ink — Task 5
- [x] Kanban card hover → neutral surface — Task 5

**Placeholder scan:** None.

**Watch out in Task 5:** The sed replacements run in a specific order. Run `rgba(255,255,255,0.11)` and `rgba(255,255,255,0.1)` replacements BEFORE each other carefully — the `0.1` pattern would match `0.10`, `0.11` etc. The order in Step 1 handles this correctly (0.11 before 0.1).
