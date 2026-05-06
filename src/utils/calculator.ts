// Premium calculation engine — matches TD Certificate of Insurance pages 27–39 exactly
import {
  CalculatorInput,
  CalculationResult,
  CoverageResult,
  PortionDetail,
  BorrowerInput,
  BorrowerResult,
  TermPortionInput,
  ValidationError,
} from '../types'
import { getLifeRate, getCiRate, PROVINCIAL_TAX_RATES } from '../data/rates'

// Step 1: Premium Rate Reduction
// Tiered: first $150k = 0%, $150k–$500k slice = 15%, $500k–$1M slice = 35%
export function calcRateReduction(totalInsuredBalance: number): number {
  if (totalInsuredBalance <= 150_000) return 0
  if (totalInsuredBalance <= 500_000) {
    return ((totalInsuredBalance - 150_000) * 0.15) / totalInsuredBalance
  }
  return ((350_000 * 0.15) + (totalInsuredBalance - 500_000) * 0.35) / totalInsuredBalance
}

// Per-portion premium — Steps 2/3 from product guide
// multiInsuredDiscount: true applies 20% after rate reduction, before PST
function calcPortionPremium(
  rate: number,
  balance: number,
  insuredPct: number,
  billingDays: number,
  rateReductionPct: number,
  multiInsuredDiscount: boolean,
  taxRate: number,
): PortionDetail & { label: string } {
  const base = (rate * balance) / 1_000
  const insured = base * insuredPct
  const daily = (insured * 12) / 365
  const monthly = daily * billingDays
  const afterRateReduction = monthly * (1 - rateReductionPct)
  const afterMultiInsured = multiInsuredDiscount ? afterRateReduction * 0.80 : afterRateReduction
  const afterTax = afterMultiInsured * (1 + taxRate)

  return {
    label: '',
    balance,
    rate,
    baseMonthly: monthly,
    afterRateReduction,
    afterMultiInsured,
    afterTax,
  }
}

function buildCoverageResult(
  type: 'Life Insurance' | 'Critical Illness Insurance',
  rateReductionPct: number,
  multiInsuredDiscountApplied: boolean,
  portions: (PortionDetail & { label: string })[],
): CoverageResult {
  const subtotalBeforeTax = portions.reduce((sum, p) => sum + p.afterMultiInsured, 0)
  const taxAmount = portions.reduce((sum, p) => sum + (p.afterTax - p.afterMultiInsured), 0)
  const total = portions.reduce((sum, p) => sum + p.afterTax, 0)
  return { type, rateReductionPct, multiInsuredDiscountApplied, portions, subtotalBeforeTax, taxAmount, total }
}

function calculateBorrowerPremium(
  borrower: BorrowerInput,
  borrowerIndex: number,
  label: string,
  termPortions: TermPortionInput[],
  revolvingBalance: number,
  isMultiInsured: boolean,
  billingDays: number,
  taxRate: number,
): BorrowerResult {
  const insuredPct = borrower.insuredBenefitPct / 100
  const useDiscount = isMultiInsured

  // Step 1: Total insured balance → rate reduction (per-borrower, uses their own insured %)
  const termInsured = termPortions.reduce((sum, tp) => sum + tp.initialAmount * insuredPct, 0)
  const revolvingInsured = revolvingBalance * insuredPct
  const totalInsuredBalance = termInsured + revolvingInsured
  const rateReductionPct = calcRateReduction(totalInsuredBalance)

  const coverages: CoverageResult[] = []
  const tpCount = termPortions.length

  // ── Life Insurance ──────────────────────────────────────────────────────────
  const lifePortions: (PortionDetail & { label: string })[] = []

  termPortions.forEach((tp, i) => {
    if (tp.initialAmount > 0) {
      const rawAge = tp.agesAtTermStart[borrowerIndex] ?? borrower.age
      const ageAtStart = Math.max(18, Math.min(69, rawAge))
      const termRate = getLifeRate(ageAtStart)
      const portion = calcPortionPremium(termRate, tp.initialAmount, insuredPct, billingDays, rateReductionPct, useDiscount, taxRate)
      portion.label = tpCount > 1 ? `Term Portion ${i + 1}` : 'Term Portion'
      lifePortions.push(portion)
    }
  })

  if (revolvingBalance > 0) {
    const revRate = getLifeRate(borrower.age)
    const portion = calcPortionPremium(revRate, revolvingBalance, insuredPct, billingDays, rateReductionPct, useDiscount, taxRate)
    portion.label = 'Revolving Portion'
    lifePortions.push(portion)
  }

  if (lifePortions.length > 0) {
    coverages.push(buildCoverageResult('Life Insurance', rateReductionPct, useDiscount, lifePortions))
  }

  // ── Critical Illness Insurance ───────────────────────────────────────────────
  if (borrower.hasCriticalIllness && borrower.age <= 55) {
    const ciPortions: (PortionDetail & { label: string })[] = []

    termPortions.forEach((tp, i) => {
      if (tp.initialAmount > 0) {
        const rawAge = tp.agesAtTermStart[borrowerIndex] ?? borrower.age
        const ageAtStart = Math.max(18, Math.min(55, rawAge))
        const termRate = getCiRate(ageAtStart)
        const portion = calcPortionPremium(termRate, tp.initialAmount, insuredPct, billingDays, rateReductionPct, useDiscount, taxRate)
        portion.label = tpCount > 1 ? `Term Portion ${i + 1}` : 'Term Portion'
        ciPortions.push(portion)
      }
    })

    if (revolvingBalance > 0) {
      const revRate = getCiRate(borrower.age)
      const portion = calcPortionPremium(revRate, revolvingBalance, insuredPct, billingDays, rateReductionPct, useDiscount, taxRate)
      portion.label = 'Revolving Portion'
      ciPortions.push(portion)
    }

    if (ciPortions.length > 0) {
      coverages.push(buildCoverageResult('Critical Illness Insurance', rateReductionPct, useDiscount, ciPortions))
    }
  }

  const subtotal = coverages.reduce((sum, c) => sum + c.total, 0)
  return { label, age: borrower.age, totalInsuredBalance, rateReductionPct, coverages, subtotal }
}

export function calculatePremium(input: CalculatorInput): CalculationResult {
  const { province, billingDays, borrowers, termPortions, revolvingBalance } = input
  const taxRate = PROVINCIAL_TAX_RATES[province] ?? 0
  const isMultiInsured = borrowers.length >= 2

  const borrowerResults: BorrowerResult[] = borrowers.map((borrower, i) =>
    calculateBorrowerPremium(
      borrower,
      i,
      borrowers.length > 1 ? `Borrower ${i + 1}` : '',
      termPortions,
      revolvingBalance,
      isMultiInsured,
      billingDays,
      taxRate,
    ),
  )

  // Flag if any term portion started before a borrower's current age
  const hasHistoricalTermPortions = termPortions.some((tp) =>
    borrowers.some((b, i) => {
      const ageAtStart = tp.agesAtTermStart[i]
      return ageAtStart > 0 && b.age > 0 && ageAtStart < b.age
    }),
  )

  const grandTotal = borrowerResults.reduce((sum, b) => sum + b.subtotal, 0)
  return { province, billingDays, taxRate, isMultiInsured, borrowerResults, grandTotal, hasHistoricalTermPortions }
}

// ── Partial Coverage Helper ──────────────────────────────────────────────────
// Returns the minimum insured benefit % for a given plan limit.
// TD requires at least $300,000 insured; below that threshold partial coverage
// is unavailable and the borrower must be insured at 100%.
export function minInsuredBenefitPct(planLimit: number): number {
  if (planLimit <= 0 || planLimit < 300_000) return 100
  return Math.ceil((300_000 / planLimit) * 100)
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateInput(input: CalculatorInput): ValidationError[] {
  const errors: ValidationError[] = []

  if (!input.province) {
    errors.push({ field: 'province', message: 'Please select a province.' })
  }
  if (input.billingDays < 28 || input.billingDays > 31) {
    errors.push({ field: 'billingDays', message: 'Billing days must be between 28 and 31.' })
  }

  // Plan limit
  if (!input.planLimit || input.planLimit <= 0) {
    errors.push({ field: 'planLimit', message: 'Please enter the FlexLine plan limit.' })
  }

  // Per-borrower
  const minPct = minInsuredBenefitPct(input.planLimit)
  input.borrowers.forEach((b, i) => {
    const tag = input.borrowers.length > 1 ? `Borrower ${i + 1}: ` : ''
    if (b.age < 18 || b.age > 69) {
      errors.push({ field: `b${i}.age`, message: `${tag}Age must be between 18 and 69.` })
    }
    if (b.hasCriticalIllness && b.age > 55) {
      errors.push({ field: `b${i}.age`, message: `${tag}CI Insurance is only available for ages 18–55.` })
    }
    if (b.insuredBenefitPct < minPct || b.insuredBenefitPct > 100) {
      if (input.planLimit > 0 && input.planLimit < 300_000) {
        errors.push({ field: `b${i}.insuredPct`, message: `${tag}Partial coverage is not available — plan limit is below $300,000.` })
      } else if (input.planLimit >= 300_000) {
        errors.push({ field: `b${i}.insuredPct`, message: `${tag}Insured Benefit must be between ${minPct}% and 100% (minimum $300,000 on a ${formatCAD(input.planLimit)} plan).` })
      } else {
        errors.push({ field: `b${i}.insuredPct`, message: `${tag}Insured Benefit must be between 1% and 100%.` })
      }
    }
  })

  // Term portions — validate amount and each borrower's age at term start
  input.termPortions.forEach((tp, i) => {
    if (tp.initialAmount <= 0) {
      errors.push({ field: `tp.${i}.amount`, message: `Term Portion ${i + 1}: initial amount must be greater than $0.` })
    }
    input.borrowers.forEach((b, j) => {
      const borrowerTag = input.borrowers.length > 1 ? `Borrower ${j + 1} ` : ''
      const ageAtStart = tp.agesAtTermStart[j]
      if (!ageAtStart || ageAtStart < 18 || ageAtStart > 69) {
        errors.push({
          field: `tp.${i}.age.${j}`,
          message: `Term Portion ${i + 1}: ${borrowerTag}age at term start must be between 18 and 69.`,
        })
      } else if (b.age >= 18 && ageAtStart > b.age) {
        errors.push({
          field: `tp.${i}.age.${j}`,
          message: `Term Portion ${i + 1}: ${borrowerTag}age at term start (${ageAtStart}) cannot exceed current age (${b.age}).`,
        })
      }
    })
  })

  if (input.revolvingBalance < 0) {
    errors.push({ field: 'revolving', message: 'Revolving balance cannot be negative.' })
  }
  if (input.termPortions.length === 0 && input.revolvingBalance <= 0) {
    errors.push({ field: 'coverage', message: 'Please add at least one Term Portion or enter a Revolving Portion balance.' })
  }

  // Total balance constraints
  const totalBalance = input.termPortions.reduce((sum, tp) => sum + tp.initialAmount, 0) + input.revolvingBalance
  if (input.planLimit > 0 && totalBalance > input.planLimit) {
    errors.push({
      field: 'totalLimit',
      message: `Total balance (${formatCAD(totalBalance)}) cannot exceed the plan limit (${formatCAD(input.planLimit)}).`,
    })
  }
  if (totalBalance > 1_000_000) {
    errors.push({ field: 'totalLimit', message: 'Total insured amount cannot exceed $1,000,000.' })
  }

  return errors
}

export function formatCAD(amount: number): string {
  return amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
}

export function formatPct(pct: number): string {
  return (pct * 100).toFixed(4) + '%'
}
