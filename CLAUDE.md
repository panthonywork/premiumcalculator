# TD FlexLine Protection Plan Quote Calculator

## Project Overview
Internal tool for TD advisors to generate accurate monthly premium quotes for the **TD Home Equity FlexLine Protection Plan** (Line of Credit Critical Illness and Life Insurance). Replaces manual calculation from the product guide with a fast, accurate, branded web calculator.

## Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (utility-first, no separate CSS files except index.css)
- **PDF Export**: jsPDF + jspdf-autotable (Phase 3)
- **Hosting**: Vercel (Phase 4)

## Commands
```bash
npm install        # Install all dependencies
npm run dev        # Start local dev server at http://localhost:5173
npm run build      # Type-check and build for production
npm run preview    # Preview production build locally
```

## Project Structure
```
src/
├── types.ts                  # All TypeScript interfaces
├── data/rates.ts             # Premium rate tables + provincial tax rates
├── utils/calculator.ts       # Pure calculation functions (no React)
├── components/
│   ├── Header.tsx            # TD-branded header
│   ├── CalculatorForm.tsx    # Input form with state management
│   └── ResultsPanel.tsx      # Premium breakdown display
├── App.tsx                   # Root layout, wires form → results
├── main.tsx                  # React entry point
└── index.css                 # Tailwind directives only
```

## Calculation Rules (Critical — Must Match Product Guide Exactly)
Source: TD Certificate of Insurance, pages 27–39.

### Premium Rate Table
Rates are **monthly per $1,000 of coverage**. Life Insurance: ages 18–69. Critical Illness: ages 18–55 (56–69 only under Recognition of Prior Coverage). Ages 18–29 all share the same rate.

### Step-by-Step Formula (per coverage type, per portion)
1. **Step 1 — Rate Reduction**: Based on total insured balance across all portions × insured benefit %
   - ≤ $150,000: 0% reduction
   - $150k–$500k portion: 15% reduction on that slice
   - $500k–$1M portion: 35% reduction on that slice
   - Formula: `(slice1 × 0.15 + slice2 × 0.35) / totalInsured`
2. **Step 2 (Term Portion)**: Rate at **age when term started** (fixed for term duration)
   - `rate × termInitialAmount / 1000 × insuredPct × 12/365 × billingDays`
   - Apply rate reduction → apply multi-insured discount (20% if joint) → apply PST
3. **Step 3 (Revolving Portion)**: Rate at **current age** (end of billing period)
   - `rate × avgDailyBalance / 1000 × insuredPct × 12/365 × billingDays`
   - Apply rate reduction → apply multi-insured discount → apply PST

### Multi-Insured Discount
20% discount applied to **each borrower's** premium separately when 2+ people insured on same FlexLine. Applied **after** rate reduction, **before** PST.

### Provincial Sales Tax
- Ontario: 8% | Quebec: 9% | Manitoba: 7% | All others: 0%

### Eligibility
- Life Insurance: age 18–69
- Critical Illness: age 18–55 (standard); CI requires Life Insurance

## Code Conventions
- All calculations in `utils/calculator.ts` — keep pure (no side effects, no React)
- Use TypeScript strict mode; no `any` types
- Tailwind only for styling — no inline styles, no separate `.css` files
- TD brand green: `#00843D` (configured as `td-green` in Tailwind)
- Functional components with hooks only — no class components
- Format currency with `toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })`

## Gotchas
- The billing period is NOT the calendar month — it runs from the second-last business day of the previous month to the third-last business day of the current month. The calculator uses an approximation (days in selected month or manual input).
- Term Portion rate uses **age at term start**, not current age. These can differ if the term started years ago.
- Critical Illness Insurance is only available **if Life Insurance is also selected**.
- Rate reduction uses the insured balance (after applying insured benefit %), not the full limit.
- For joint coverage, each borrower's rate reduction is calculated independently based on their own insured amounts.
- The `12/365` factor converts the monthly rate to a daily rate to handle variable billing period lengths.
