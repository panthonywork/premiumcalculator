# FlexLine Calculator — Maintenance Guide

> **Use this file two ways:**
> 1. Read it top-to-bottom if you're new to the project and want to make a change.
> 2. Paste its contents into ChatGPT (or any chat AI) at the start of a session before asking the AI to help you edit the code. The AI then has the full picture of what this app is, how it's built, and what's safe to touch.

---

## 1. What this app is

The **TD FlexLine Protection Plan Premium Calculator** is an internal tool that lets a TD advisor enter a few inputs (age, plan limit, balance, province) and instantly see the monthly premium quote that TD will bill for the FlexLine Protection Plan (Line of Credit Critical Illness and Life Insurance).

It replaces a manual lookup-and-multiply process out of the TD Certificate of Insurance product guide.

It is **not** customer-facing. It is for licensed TD advisors only.

### Tech stack

- **React 18** with **TypeScript** (strict mode)
- **Vite** as the build tool
- **Tailwind CSS** for all styling (no separate `.css` files except `src/index.css`)
- No backend. No database. No external API calls. Everything runs in the browser.

### Distribution model

The build process produces **one self-contained HTML file** (`dist/index.html`, around 190 KB) that gets uploaded to SharePoint. Advisors download and double-click; the file opens in their browser and runs locally. No server, no install, no internet required at runtime.

Because the HTML is a **frozen snapshot** — all rate tables, calculation logic, styling, and even SVG icons are baked into the file at build time — any change requires a rebuild and re-upload.

---

## 2. The update flow at a glance

```
   You edit source code in VSCode
              │
              ▼
   Push to GitHub (panthonywork/premiumcalculator)
              │
              ▼
   Build runs: `npm run build:single`
              │
              ▼
   New `dist/index.html` is produced (~190 KB)
              │
              ▼
   You upload it to SharePoint, replacing the old version
              │
              ▼
   Advisors download the new file the next time they need a quote
```

Whoever is doing the build needs Node.js + npm installed. If your work computer doesn't allow that, the build can be done on a personal machine, or via a GitHub Actions workflow that builds automatically on every push.

---

## 3. File map — only the files that matter for maintenance

The repo has both a Streamlit (Python) version and a React (TypeScript) version of the calculator. **For HTML maintenance you only ever touch the React side.** Ignore everything in `flexline/`, `streamlit_app.py`, `requirements.txt`, and `.streamlit/`.

| File | What it controls | How often you'll edit it |
|---|---|---|
| `src/data/rates.ts` | Life and CI rate tables; provincial tax rates; province list | Whenever TD updates published rates or tax changes — most common edit |
| `src/components/ResultsPanel.tsx` | Output panel; the bottom "Important Disclosures" box | Occasional disclosure-text tweaks |
| `src/components/CalculatorForm.tsx` | Input form; help text under each field; small footer note | Occasional copy tweaks |
| `src/components/Header.tsx` | Title bar; the inline TD shield SVG; subtitle | Rare — only if branding wording changes |
| `src/utils/calculator.ts` | The math engine | **Edit only with product-team sign-off.** Has to match the product guide exactly. |
| `src/types.ts` | TypeScript type definitions | Rare — only if you're adding a new input field |
| `src/App.tsx` | Top-level layout | Rare |
| `index.html` (project root) | Page shell, favicon | Almost never |

### What lives where, in three lines

- **Numbers** (rates, tax %): `src/data/rates.ts`
- **Words** (labels, disclaimers, helper text): `src/components/*.tsx`
- **Math** (premium formula): `src/utils/calculator.ts`

---

## 4. Common edit recipes

### 4.1 Update a rate table (most common task)

When TD publishes new rates in the Certificate of Insurance, update the dictionaries in `src/data/rates.ts`.

**Shape of the file** (do not change the structure, just the numbers):

```ts
export const LIFE_RATES: Record<number, number> = {
  18: 0.10, 19: 0.10, 20: 0.10, // … one entry per age, 18 through 69
  // …
}

export const CI_RATES: Record<number, number> = {
  18: 0.11, 19: 0.11, 20: 0.11, // … one entry per age, 18 through 69
  // …
}
```

Keys are ages (integers). Values are monthly rates per $1,000 of coverage (decimal dollars).

**Rules**

- Every age from 18 to 69 must be present in both tables.
- Values must be numbers, not strings (no quotes around the number).
- Do not change the variable names (`LIFE_RATES`, `CI_RATES`) — `calculator.ts` imports them.
- The order of keys does not matter for correctness, but keeping them ascending makes diffs easier to read.

**ChatGPT prompt template**

```
Here is the current rates.ts file:

<paste full contents of src/data/rates.ts>

TD has updated the Life rate table. Replace the LIFE_RATES dict with these
new values, keeping everything else (CI_RATES, PROVINCIAL_TAX_RATES, the
helper functions) exactly the same. Return the entire updated file.

New Life rates (age: rate per $1,000):
  18: 0.10
  19: 0.10
  …
```

### 4.2 Update a provincial sales tax rate

Same file (`src/data/rates.ts`), different dict:

```ts
export const PROVINCIAL_TAX_RATES: Record<string, number> = {
  'Alberta': 0,
  'Manitoba': 0.07,
  'Ontario': 0.08,
  'Quebec': 0.09,
  // … 13 entries, one per province / territory
}
```

Values are decimals (`0.08` means 8%). Province name strings must match exactly — they appear in the dropdown and they are what `calculator.ts` looks up.

### 4.3 Add or remove a province

If a new territory is added, or one is renamed, edit the same dict above. The dropdown in the form populates automatically from the keys of `PROVINCIAL_TAX_RATES` (via the exported `PROVINCES` array at the bottom of the file). No other change needed.

### 4.4 Update the disclosure / disclaimer text

Open `src/components/ResultsPanel.tsx` and search for "Important Disclosures". You'll find this block:

```tsx
<ul className="text-amber-700 text-xs space-y-1 list-disc list-inside">
  <li>This estimate is for advisor use only. …</li>
  <li>Rates are per $1,000 of coverage per month. …</li>
  <li>Life Insurance provided by The Canada Life Assurance Company. …</li>
  <li>Coverage is subject to underwriting approval. …</li>
  <li>Maximum combined coverage: $1,000,000 per coverage type.</li>
</ul>
```

Edit the text inside the `<li>` tags. Do not remove the `<li>` tags themselves or the surrounding `<ul>`. Each bullet is one `<li>`.

There is a similar but shorter block at the bottom of `src/components/CalculatorForm.tsx` (the small grey footer paragraph beneath the Calculate button). That one's a single `<p>` and can be edited freely.

### 4.5 Update the header title or subtitle

In `src/components/Header.tsx`:

```tsx
<h1 …>FlexLine Protection Plan</h1>
<p  …>Premium Quote Calculator — Advisor Use Only</p>
```

Change the strings inside the tags. The classes (`text-white`, `text-xl`, etc.) control styling — leave those alone unless you specifically want to restyle.

### 4.6 Change the TD shield colour or text

The shield is an inline SVG in `Header.tsx`:

```tsx
<svg viewBox="0 0 80 90" …>
  <path d="…" fill="#00843D" />
  <text … fill="white">TD</text>
</svg>
```

`#00843D` is TD green. The visible "TD" text is in the `<text>` element. Change carefully — the SVG geometry was tuned to look correct at 12 × 10 in the header.

---

## 5. The calculation formula — sacred ground

The math in `src/utils/calculator.ts` mirrors the TD Certificate of Insurance product guide (pages 27–39) **exactly**. **Do not change the math without explicit product-team sign-off**, even if a number looks wrong. Premium quotes from this tool need to match what TD actually bills, or advisors will lose trust in it.

The formula at a glance:

1. **Step 1 — Rate Reduction** (volume discount). Based on total insured balance:
   - Up to $150,000: 0% reduction
   - $150,001 – $500,000 slice: 15% reduction on that slice
   - $500,001 – $1,000,000 slice: 35% reduction on that slice
   - Effective reduction percent = `(slice1 × 0.15 + slice2 × 0.35) / totalInsured`
2. **Step 2 — Term Portion premium**. Uses the rate for the borrower's age **when the term started** (not current age). Formula:
   ```
   rate × termInitialAmount / 1000 × insuredPct × 12 / 365 × billingDays
   ```
   Then apply rate reduction → multi-insured discount (if applicable) → PST.
3. **Step 3 — Revolving Portion premium**. Uses the rate for the borrower's **current age**. Same formula but with `avgDailyBalance` instead of `termInitialAmount`.
4. **Multi-insured discount**. 20% off each borrower's premium when 2+ borrowers are insured on the same FlexLine. Applied **after** rate reduction, **before** PST.
5. **PST**. 8% in Ontario, 9% in Quebec, 7% in Manitoba, 0% elsewhere.

### Eligibility constraints (also enforced in code)

- Life Insurance: age 18–69
- Critical Illness Insurance: age 18–55 (standard) — CI requires Life Insurance
- Maximum total insured per coverage type: $1,000,000
- Minimum insured benefit: $300,000 (so partial-coverage % is locked at 100% for plan limits below $300k)

---

## 6. Code conventions to keep

- **TypeScript strict mode.** No `any` types. If you need to widen a type, ask the AI to use `unknown` and a narrowing check rather than `any`.
- **Tailwind for styling.** No inline `style={{ … }}` attributes (except in dynamically computed cases). No new `.css` files.
- **Functional components with hooks only.** No class components.
- **TD brand green** is configured as `td-green` in `tailwind.config.js`. Use `bg-td-green`, `text-td-green`, `border-td-green` — don't hardcode `#00843D` elsewhere.
- **Currency formatting** uses `toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })` — already wrapped in `formatCAD()` in `calculator.ts`. Use that helper, don't build your own.
- **No new dependencies** without thinking carefully. Each new package in `package.json` has to be available at build time and approved if the build is happening in a controlled environment.

---

## 7. Build and deploy

### Prerequisites (one-time)

- Node.js 18+ and npm installed
- The repo cloned to your machine
- `npm install` run once after cloning, to fetch dependencies

### To produce a new HTML file

From a terminal in the project folder:

```bash
npm run build:single
```

This runs the TypeScript compiler (catches type errors) then a Vite build in single-file mode. The output is `dist/index.html`. That one file is what goes to SharePoint.

### Sanity check before deploying

Open the file directly in your browser (double-click `dist/index.html` or drag it into a Chrome window) **before** uploading to SharePoint. Run through this checklist:

- [ ] Header banner displays with the green TD shield and "FlexLine Protection Plan" title.
- [ ] Province dropdown lists all 13 provinces/territories.
- [ ] If you changed rates: pick a known-good test case (e.g. Ontario, age 40, $100k revolving, no term portion, 30 days) and confirm the result matches your hand calculation. For that case the answer is **$26.63/mo**.
- [ ] Add a second borrower; confirm the green "20% multi-insured discount will be applied" notice appears.
- [ ] If you changed disclaimer text: scroll to the bottom of the results panel and read it back.

### To deploy

Replace the existing file in the SharePoint document library with the new `index.html`. Optionally rename it to something memorable for advisors (e.g. `FlexLine-Calculator-v2.html`) so they can tell new from old.

---

## 8. Working with ChatGPT 5.5 (or any chat-only AI)

The AI cannot see your files. You're its eyes. A few patterns that make these sessions go smoothly:

### Always paste full files, not snippets

Bad:
> "Update the LIFE_RATES dict — change age 40 to 0.27."

Good:
> "Here is `src/data/rates.ts`:
>
> [paste the entire file here]
>
> Change the LIFE_RATES entry for age 40 from 0.25 to 0.27. Leave everything else exactly as it was. Return the full updated file."

The AI gets confused if it has to imagine the surrounding context.

### Always ask for the full file back

Diffs ("here's just the changed line") are fragile to apply by hand. Ask the AI to print the **entire updated file** and replace your VSCode buffer with that. VSCode's source-control panel will then show you the real diff against `main`, which is what you actually want to review.

### Confirm the AI has the right picture

If you're starting a new chat session, paste this `MAINTENANCE.md` first as context, then ask:
> "Confirm you understand: (1) what this app is, (2) which file I should edit to update a rate, (3) what file I must NOT edit without product-team sign-off."

A few short sentences back tells you the AI got it.

### Ask the AI to flag risk

Add to your prompt:
> "If anything I'm asking would change the calculation logic, the validation rules, or the structure of the rate tables (versus just the values), stop and warn me before producing the new file."

This catches accidents where you ask for a "small change" that turns out to need a bigger refactor.

### Use VSCode's Source Control diff view

After pasting the AI's output back into VSCode, open Source Control (Ctrl+Shift+G). The "Working Tree" diff for that file shows exactly what changed. Look at every coloured line. If you see a change you didn't ask for — a renamed function, a new import, a removed comment — push back: "This is what I asked for: X. The diff also shows Y and Z, which I did not ask for. Please redo without those."

### Example: a clean prompt for updating Ontario PST

> Here is `src/data/rates.ts`:
>
> [paste full file]
>
> The Ontario provincial sales tax on insurance premiums has changed from 8% to 9%. Update the value for `'Ontario'` in the `PROVINCIAL_TAX_RATES` dict from `0.08` to `0.09`. Leave every other province, the rate tables, and the helper functions untouched. Return the complete updated file.

The AI will produce the full file with one number changed. You replace your buffer, check the diff, commit.

---

## 9. What you should NOT change without thinking carefully

- **`src/utils/calculator.ts`** — the math engine. Edits here can silently produce wrong premium quotes that look correct. Get product-team confirmation before changing anything beyond a comment.
- **`src/types.ts`** — type definitions are referenced everywhere. Adding a field is fine; renaming or removing one will break the build until every callsite is updated.
- **`vite.config.ts`** and `package.json`'s `"scripts"` block — these define how the build works. If `npm run build:single` stops producing a single file, the SharePoint deployment story is broken.
- **`tailwind.config.js`** — the `td-green` colour token is defined here. Changing it changes branding everywhere.
- **The shape of `rates.ts` exports** — `LIFE_RATES`, `CI_RATES`, `PROVINCIAL_TAX_RATES`, `PROVINCES` are imported by other files. Change values, not names.

---

## 10. If something breaks

- **Build fails with a TypeScript error.** The error message will name a file and line. Open that file, look at the line. Often it's a type mismatch caused by changing a value's type (e.g. wrapping a number in quotes, making it a string). Undo your last change and try again, smaller.
- **Build succeeds but the calculator shows wrong numbers.** Check `rates.ts` first. The most common cause is a typo in a rate (extra zero, wrong decimal place).
- **The HTML file is too big** (over ~500 KB). You probably accidentally added a large dependency. Run `npm ls` to see what's installed.
- **The shield doesn't render.** Open the file in Chrome, then DevTools (F12) → Console. Errors there will name the issue. Almost always a typo in the inline SVG in `Header.tsx`.

When in doubt: revert to the last known-good commit (`git log` to find one, `git checkout <commit-sha> -- <file>` to restore it), rebuild, redeploy. The HTML is just a snapshot — there's nothing to "roll back" on SharePoint other than putting an older file back.

---

## Appendix — known-good test cases

Quick ground-truth values. If after a code change these stop matching, something broke.

| Inputs | Expected total premium |
|---|---|
| Ontario, 30-day, plan $500k, 1 borrower age 40, life-only, $100k revolving, no term portion, 100% insured | **$26.63 / mo** |
| Ontario, 30-day, plan $500k, 1 borrower age 40, life-only, $200k term started at age 35, $100k revolving, 100% insured | **$58.13 / mo** |
| Same as above but 2 borrowers (both age 40, term ages 35 each) — expect 20% multi-insured discount | **$93.01 / mo** (each borrower $46.51) |

These were computed by hand from the product guide formula and verified against a working build. If you change rate values you'll need to recompute these — but the structure of the test (which inputs map to which output) stays valid.
