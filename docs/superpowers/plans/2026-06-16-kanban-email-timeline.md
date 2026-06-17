# Kanban Email Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add follow-up email timeline visibility to the Kanban board — step badges on cards, collapsible email body previews in the detail panel, and a sequence preview for new recipients who haven't been emailed yet.

**Architecture:** Four isolated changes across two files. The API fix (Task 1) unblocks the body preview (Task 3). Card badges (Task 2) and sequence preview (Task 4) are independent and can be done in any order. All rendering is in-component — no new files, no new API routes.

**Tech Stack:** Next.js 15 App Router, React 18 (`useState`), Prisma v7, TypeScript, inline CSS with `var(--*)` design tokens, `dangerouslySetInnerHTML` for email body preview.

---

## File Map

| File | What changes |
|------|-------------|
| `app/api/campaigns/[id]/recipients/[recipientId]/route.ts` | Add `bodyHtmlTemplate: true` + `bodyTextTemplate: true` to step `select` |
| `app/campaigns/[id]/page.tsx` | (1) `expandedSends` state, (2) step badge on cards, (3) "▼ View email" toggle in Email History, (4) sequence preview for `sends.length === 0` |

---

### Task 1: Expose email body templates in recipient detail API

**Files:**
- Modify: `app/api/campaigns/[id]/recipients/[recipientId]/route.ts:12-14`

- [ ] **Step 1: Update step `select` to include body templates**

In `app/api/campaigns/[id]/recipients/[recipientId]/route.ts`, change line 13:

```typescript
// Before:
include: { step: { select: { stepNumber: true, subjectTemplate: true } } },

// After:
include: { step: { select: { stepNumber: true, subjectTemplate: true, bodyHtmlTemplate: true, bodyTextTemplate: true } } },
```

The full GET handler after the change:

```typescript
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { id, recipientId } = await params;
  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, campaignId: id },
    include: {
      scheduledSends: {
        include: { step: { select: { stepNumber: true, subjectTemplate: true, bodyHtmlTemplate: true, bodyTextTemplate: true } } },
        orderBy: { scheduledAt: 'asc' },
      },
      replies: { orderBy: { receivedAt: 'asc' } },
    },
  });
  if (!recipient) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(recipient);
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/campaigns/[id]/recipients/[recipientId]/route.ts
git commit -m "feat: expose bodyHtmlTemplate and bodyTextTemplate in recipient detail API"
```

---

### Task 2: Step badge on `in_sequence` Kanban cards

**Files:**
- Modify: `app/campaigns/[id]/page.tsx` (around line 794 — the opens badge block)

**Context:** `r.currentStep` is already included in the recipient list response (Prisma spreads the full `Recipient` model). Each Kanban card is rendered at ~line 762–822. The `r._opens > 0` opens badge is at line 794.

- [ ] **Step 1: Add step badge after the opens badge**

Locate the opens badge block in the Kanban card (line 794–801):

```tsx
{r._opens > 0 && (
  <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '2px 7px' }}>
    <span style={{ fontSize: 9 }}>👁</span>
    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.05em' }}>
      {r._opens}× opened
    </span>
  </div>
)}
```

Add the step badge **immediately after** that block (before the `r.stage === 'new'` send button block at line 802):

```tsx
{r.stage === 'in_sequence' && r.currentStep > 0 && (
  <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 4, padding: '2px 7px' }}>
    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#818CF8', letterSpacing: '0.05em' }}>
      Step {r.currentStep}
    </span>
  </div>
)}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

Start dev server: `npm run dev`. Open a campaign that has `in_sequence` recipients. Confirm "Step N" badge appears on their cards in indigo, and does NOT appear on cards in other stages.

- [ ] **Step 4: Commit**

```bash
git add app/campaigns/[id]/page.tsx
git commit -m "feat: add step badge to in_sequence kanban cards"
```

---

### Task 3: Collapsible email body preview in Email History

**Files:**
- Modify: `app/campaigns/[id]/page.tsx` (state section + Email History JSX at ~line 1471–1503)

**Context:**
- `detailRecipient` is the raw API response, loaded via `fetchDetail(id)` which hits `/api/campaigns/[id]/recipients/[recipientId]`.
- After Task 1, `s.step.bodyHtmlTemplate` is available on each send.
- The detail panel renders inside an IIFE at line 1407. State hooks can't live inside IIFEs — `expandedSends` must be added at the top of the component with the other `useState` calls.
- Recipient variables are in `detailRecipient.data` (a JSON object like `{ firstName: "John", company: "Acme" }`).

- [ ] **Step 1: Add `expandedSends` state at the top of the component**

Find the block of `useState` calls near the top of the component (around line 37). Add after the existing states:

```typescript
const [expandedSends, setExpandedSends] = useState<Set<string>>(new Set());
```

Also add this helper function **outside the component** (place it above the component declaration, near other utility functions):

```typescript
function renderTpl(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}
```

- [ ] **Step 2: Add toggle button and body preview to each Email History row**

Locate the Email History send row (lines 1479–1502). The send row currently ends after the opens badge block (`</div>` at line 1501). 

Add the toggle button and body preview **inside the send row `<div>` key block**, after the opens/not-opened span block and before the closing `</div>` of the row:

```tsx
{/* View email toggle — only if body template is available */}
{s.step?.bodyHtmlTemplate && (
  <div style={{ marginTop: 8 }}>
    <button
      onClick={() => setExpandedSends(prev => {
        const next = new Set(prev);
        next.has(s.id) ? next.delete(s.id) : next.add(s.id);
        return next;
      })}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
        padding: 0, letterSpacing: '0.05em',
        display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      {expandedSends.has(s.id) ? '▲ Hide email' : '▼ View email'}
    </button>
    {expandedSends.has(s.id) && (
      <div
        style={{
          marginTop: 8, borderRadius: 6, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        dangerouslySetInnerHTML={{
          __html: renderTpl(s.step.bodyHtmlTemplate, d),
        }}
      />
    )}
  </div>
)}
```

Note: `d` is `(detailRecipient.data ?? {}) as Record<string, string>` — already defined in the IIFE at line 1408.

- [ ] **Step 3: Reset expanded sends when detail panel changes recipient**

Find where `setDetailRecipient` is called to open a new recipient (the `fetchDetail` call). It's triggered by card clicks. After `setDetailRecipient(...)` calls that open a new panel, add:

```typescript
setExpandedSends(new Set());
```

Find the `fetchDetail` function and locate where it sets `detailRecipient`. It likely calls `setDetailRecipient(data)` after the fetch. Add the reset before or after that call.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Verify visually**

Open the detail panel for a recipient who has been sent an email (status `sent`). Confirm:
- "▼ View email" appears on sent emails that have a body template
- Clicking it expands to show the rendered HTML with variables substituted
- Clicking "▲ Hide email" collapses it
- Opening a different recipient's panel collapses all previews

- [ ] **Step 6: Commit**

```bash
git add app/campaigns/[id]/page.tsx
git commit -m "feat: add collapsible email body preview in detail panel email history"
```

---

### Task 4: Sequence preview for new recipients

**Files:**
- Modify: `app/campaigns/[id]/page.tsx` (~line 1476 — the `sends.length === 0` branch)

**Context:**
- `steps` is page-level state loaded from `/api/campaigns/${id}/steps` (line 76). It contains all `SequenceStep` records in order: `{ stepNumber, subjectTemplate, bodyHtmlTemplate, bodyTextTemplate, delayDaysFromPrevious }`.
- When `sends.length === 0` (recipient is `new` or hasn't launched yet), the current UI shows `"No emails sent yet"` (line 1477).
- Replace that with a preview of all upcoming steps, using `renderTpl` from Task 3 to render subject lines with recipient variables.

- [ ] **Step 1: Replace the empty-state message with sequence preview**

Locate line 1476–1477:

```tsx
{sends.length === 0 ? (
  <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>No emails sent yet</div>
) : sends.map((s: any) => (
```

Replace the `sends.length === 0` branch:

```tsx
{sends.length === 0 ? (
  steps.length === 0 ? (
    <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>No emails sent yet</div>
  ) : (
    <div>
      <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: '0.05em' }}>
        UPCOMING SEQUENCE
      </div>
      {steps.map((step: any) => (
        <div key={step.id} style={{ marginBottom: 6, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 8, padding: '8px 12px', borderLeft: '2px solid rgba(99,102,241,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
              Step {step.stepNumber} — {renderTpl(step.subjectTemplate, d)}
            </span>
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(99,102,241,0.6)', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
              {step.stepNumber === 1 ? 'Day 0' : `Day +${step.delayDaysFromPrevious}`}
            </span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
            scheduled · not sent
          </div>
        </div>
      ))}
    </div>
  )
) : sends.map((s: any) => (
```

Note: `renderTpl` must be defined (Task 3 adds it). `d` is the recipient data object from line 1408.

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/ksd/Desktop/Varnan_skills/openoutreach && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

Open the detail panel for a recipient in the `new` stage who has no sent emails. Confirm:
- "UPCOMING SEQUENCE" label appears
- Each campaign step shown with step number, rendered subject, and delay (Day 0 / Day +3 / Day +7)
- If campaign has no steps at all, shows "No emails sent yet" fallback

- [ ] **Step 4: Commit**

```bash
git add app/campaigns/[id]/page.tsx
git commit -m "feat: show upcoming sequence preview in detail panel for new recipients"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: API returns body templates
- ✅ Task 2: Step badge on `in_sequence` cards
- ✅ Task 3: Collapsible body preview in Email History
- ✅ Task 4: Sequence preview for new recipients

**Placeholder scan:** None — all code is complete.

**Dependency order:**
- Task 3 depends on Task 1 (needs `bodyHtmlTemplate` in API response).
- Tasks 2 and 4 are independent.
- Recommended order: 1 → 2 → 3 → 4.

**Type consistency:**
- `renderTpl` defined once above component, used in Tasks 3 and 4.
- `expandedSends: Set<string>` defined in Task 3 Step 1, used in Task 3 Step 2.
- `d` is `(detailRecipient.data ?? {}) as Record<string, string>` — already defined in IIFE at line 1408 in both Tasks 3 and 4.
- `steps: any[]` — page-level state, already loaded at component mount.
