export interface TermPortionInput {
  initialAmount: number
  // One entry per borrower (same index order as CalculatorInput.borrowers).
  // Each borrower's rate for this term portion is locked at the age they were
  // when coverage on this portion began.
  agesAtTermStart: number[]
}

export interface BorrowerInput {
  age: number
  hasCriticalIllness: boolean
  insuredBenefitPct: number // 1–100
}

export interface CalculatorInput {
  province: string
  billingDays: number
  planLimit: number            // Total FlexLine credit limit set by the bank
  // 1–4 borrowers. Multi-insured discount (20%) applies automatically when ≥ 2.
  borrowers: BorrowerInput[]
  // Shared FlexLine figures — same for all borrowers on this account.
  termPortions: TermPortionInput[]
  revolvingBalance: number
}

export interface PortionDetail {
  label: string
  balance: number
  rate: number
  baseMonthly: number
  afterRateReduction: number
  afterMultiInsured: number // same as afterRateReduction when single borrower
  afterTax: number
}

export interface CoverageResult {
  type: 'Life Insurance' | 'Critical Illness Insurance'
  rateReductionPct: number
  multiInsuredDiscountApplied: boolean
  portions: PortionDetail[]
  subtotalBeforeTax: number
  taxAmount: number
  total: number
}

export interface BorrowerResult {
  label: string
  age: number
  totalInsuredBalance: number
  rateReductionPct: number
  coverages: CoverageResult[]
  subtotal: number
}

export interface CalculationResult {
  province: string
  billingDays: number
  taxRate: number
  isMultiInsured: boolean
  borrowerResults: BorrowerResult[]
  grandTotal: number
  // True when any term portion started before a borrower's current age
  hasHistoricalTermPortions: boolean
}

export interface ValidationError {
  field: string
  message: string
}
