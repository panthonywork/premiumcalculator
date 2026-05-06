# TD FlexLine Protection Plan Calculator — Master Phase Plan

## Project Context
**Goal**: A web-based calculator that lets TD advisors instantly generate accurate monthly premium quotes for the TD Home Equity FlexLine Protection Plan (Life + Critical Illness Insurance).

**Key Facts for New Sessions**:
- Product: Line of Credit Critical Illness and Life Insurance for TD Home Equity FlexLine
- Source document: [TD Certificate of Insurance](https://www.tdinsurance.com/content/dam/tdinsurance/document/pdf/products-services/certificate-td-line-of-credit-protection-flexline-en.pdf)
- Users: TD Advisors (internal use, desktop browser, no login required)
- Coverage types: Life Insurance + Critical Illness Insurance
- Output: On-screen quote + branded PDF with disclosures (TD Green, TD logo)
- Hosting target: Vercel (simple web hosting, shareable URL)
- No data persistence — fresh each session

**Decisions Made**:
- Tech stack: React 18 + Vite + TypeScript + Tailwind CSS
- PDF export: jsPDF + jspdf-autotable (Phase 3)
- No login/authentication required
- No database — all calculations client-side
- TD branding: #00843D green, TD shield logo
- Multi-insured (joint) discount: 20% per borrower when 2+ insured

---

## Phase Status Tracker

| Phase | Name | Status | Session |
|-------|------|--------|---------|
| 1 | Foundation + Core Calculator | ✅ COMPLETE | Session 1 |
| 2 | Joint Coverage + Advanced Features | ⏳ Pending | Session 2 |
| 3 | PDF Export + Branding Polish | ⏳ Pending | Session 3 |
| 4 | Deployment + Final Testing | ⏳ Pending | Session 4 |

---

## Phase 1 — Foundation + Core Calculator
**Session**: 1 | **Status**: ✅ COMPLETE

### Goal
A fully working, accurate premium calculator for a single borrower, covering Life Insurance and/or Critical Illness Insurance, with one Term Portion and/or a Revolving Portion.

### Scope
- ✅ Project scaffold (React + Vite + TypeScript + Tailwind CSS)
- ✅ CLAUDE.md and PHASES.md
- ✅ Complete premium rate data (all ages, both coverage types)
- ✅ Core calculation engine (`utils/calculator.ts`)
- ✅ Province selector with PST applied automatically
- ✅ Billing period days input (default 30)
- ✅ Single borrower with:
  - Life Insurance only OR Life + Critical Illness
  - One Term Portion (optional): initial amount + age at term start
  - Revolving Portion: average daily balance
  - Insured Benefit % (default 100%, for partial coverage cases)
- ✅ Premium rate reduction (tiered: $150k / $500k / $1M)
- ✅ Results breakdown (per portion, per coverage type)
- ✅ TD-branded header
- ✅ Local dev server running and verified

### NOT in Phase 1
- Joint/multi-insured coverage (Phase 2)
- Multiple Term Portions (Phase 2)
- PDF generation (Phase 3)
- Print layout (Phase 3)
- Deployment (Phase 4)

### How to Start a New Session for Phase 1
```
Load PHASES.md and CLAUDE.md. Phase 1 is in progress.
Run: npm run dev in /Users/crypto/Documents/Claude/Projects/Premium Calculator
The calculator is at http://localhost:5173
Continue from where Phase 1 left off.
```

---

## Phase 2 — Joint Coverage + Advanced Features
**Session**: 2 | **Status**: Pending

### Goal
Extend the calculator to support two borrowers (joint coverage with 20% multi-insured discount), multiple Term Portions per borrower, and improved input validation and UX polish.

### Scope (planned)
- Second borrower section (age, coverage type, insured %)
- 20% multi-insured discount applied to each borrower's premium independently
- Up to 3 Term Portions per borrower (with different ages at term start)
- Clear input validation with user-friendly error messages
- "Borrower 2" toggle — enable/disable joint coverage
- Improved results layout showing per-borrower + combined total
- Province-specific UI note about PST
- Better mobile responsiveness

### How to Start Phase 2 (new session prompt)
```
Load PHASES.md and CLAUDE.md. Phase 1 is complete.
Run: npm run dev in /Users/crypto/Documents/Claude/Projects/Premium Calculator
Phase 2 goal: Add joint coverage (2nd borrower with 20% multi-insured discount) and multiple Term Portions.
Begin Phase 2.
```

---

## Phase 3 — PDF Export + Branding Polish
**Session**: 3 | **Status**: Pending

### Goal
Generate a branded, professional PDF quote that advisors can print or email to clients. Must include all applicable disclosures and disclaimers from the product guide.

### Scope (planned)
- Install jsPDF + jspdf-autotable
- "Generate PDF Quote" button in the results panel
- PDF contents:
  - TD shield logo (top left) + title "FlexLine Protection Plan Quote"
  - Date generated
  - Borrower details (age, province, coverage type, amounts)
  - Premium breakdown table (matching screen layout)
  - Monthly total highlighted
  - Required disclosures:
    - "This quote is an estimate only. Actual premiums may vary."
    - "Coverage is subject to approval. Terms and conditions apply."
    - "Life Insurance available ages 18–69. Critical Illness available ages 18–55."
    - "Maximum coverage $1,000,000 per coverage type."
    - "Rates do not include provincial sales tax where applicable."
    - Underwriter disclosure (Canada Life / TD Life)
  - TD green colour scheme matching the screen UI
- Print-friendly CSS (media query)
- TD logo asset in `/public/`

### How to Start Phase 3
```
Load PHASES.md and CLAUDE.md. Phases 1 and 2 are complete.
Run: npm run dev in /Users/crypto/Documents/Claude/Projects/Premium Calculator
Phase 3 goal: PDF generation with TD branding and all required disclosures.
Begin Phase 3.
```

---

## Phase 4 — Deployment + Final Testing
**Session**: 4 | **Status**: Pending

### Goal
Deploy the app to Vercel so any TD advisor can access it via a shareable URL. Verify all calculations match the product guide examples. Provide advisor documentation.

### Scope (planned)
- Create Vercel account (if needed) and deploy
- Verify all 5 product guide calculation examples produce correct results
- Test on Chrome, Safari, Edge
- Test on iPad (secondary target)
- Create simple "How to Use" one-pager for advisors
- Custom domain (optional — e.g., td-flexline-calc.vercel.app)
- Ongoing maintenance notes

### How to Start Phase 4
```
Load PHASES.md and CLAUDE.md. Phases 1, 2, and 3 are complete.
Phase 4 goal: Deploy to Vercel, verify all calculations, and document for advisors.
Begin Phase 4.
```

---

## Premium Calculation Reference (for all sessions)

### Rate Table Summary
| Age | Life $/1000 | CI $/1000 |
|-----|-------------|-----------|
| 18-29 | $0.10 | $0.11 |
| 30 | $0.11 | $0.13 |
| 34 | $0.16 | $0.19 |
| 40 | $0.25 | $0.31 |
| 50 | $0.47 | $0.77 |
| 55 | $0.61 | $1.26 |
| 69 | $1.66 | $2.55* |
*ROPC only

### Rate Reduction Formula
```
totalInsured = sum(termInitial × insuredPct) + revolvingAvg × insuredPct

if totalInsured ≤ 150,000: reduction = 0%
elif totalInsured ≤ 500,000: reduction = (totalInsured - 150,000) × 15% / totalInsured
else: reduction = (350,000 × 15% + (totalInsured - 500,000) × 35%) / totalInsured
```

### Portion Premium Formula
```
base = rate × balance / 1000
insured = base × insuredBenefitPct
daily = insured × 12 / 365
monthly = daily × billingDays
afterReduction = monthly × (1 - rateReductionPct)
afterDiscount = afterReduction × (1 - multiInsuredDiscountPct)  // 0.20 if joint
final = afterDiscount × (1 + provincialTaxRate)
```

### Provincial Tax Rates
- Ontario: 8% | Quebec: 9% | Manitoba: 7% | All others: 0%

### Key Business Rules
- CI only available WITH Life Insurance
- CI: ages 18–55 (standard); ages 56–69 only under ROPC
- Life: ages 18–69
- Max coverage: $1,000,000 per coverage type
- Term rate = rate at **age when term started** (fixed for term duration)
- Revolving rate = rate at **current age** (end of billing period)
- Joint discount: 20% per borrower, applied after rate reduction, before PST
- Rate reduction calculated per borrower based on their own insured amounts
