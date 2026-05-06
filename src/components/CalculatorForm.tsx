import { useState } from 'react'
import { CalculatorInput, BorrowerInput, TermPortionInput, ValidationError } from '../types'
import { PROVINCES } from '../data/rates'
import { validateInput, minInsuredBenefitPct } from '../utils/calculator'

interface Props {
  onCalculate: (input: CalculatorInput) => void
  onReset: () => void
}

const DEFAULT_BORROWER: BorrowerInput = {
  age: 0,
  hasCriticalIllness: false,
  insuredBenefitPct: 100,
}

const DEFAULT_STATE: CalculatorInput = {
  province: '',
  billingDays: 30,
  planLimit: 0,
  borrowers: [{ ...DEFAULT_BORROWER }],
  termPortions: [],
  revolvingBalance: 0,
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function FieldError({ errors, field }: { errors: ValidationError[]; field: string }) {
  const err = errors.find((e) => e.field === field)
  if (!err) return null
  return <p className="text-red-600 text-xs mt-1">{err.message}</p>
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h2 className="text-td-green font-semibold text-base mb-4 pb-2 border-b border-td-green-muted">
        {title}
      </h2>
      {children}
    </div>
  )
}

const inputClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-td-green focus:border-td-green transition'
const dollarInputClass = inputClass + ' pl-7'

// ── Borrower Card ─────────────────────────────────────────────────────────────

interface BorrowerCardProps {
  index: number
  total: number
  borrower: BorrowerInput
  planLimit: number
  errors: ValidationError[]
  onChange: (updated: BorrowerInput) => void
  onRemove: () => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
}

function BorrowerCard({
  index,
  total,
  borrower,
  planLimit,
  errors,
  onChange,
  onRemove,
  showAdvanced,
  onToggleAdvanced,
}: BorrowerCardProps) {
  const age = borrower.age
  const ciDisabled = age > 55 || age < 18
  const prefix = `b${index}.`

  const partialNotAvailable = planLimit > 0 && planLimit < 300_000
  const minPct = planLimit >= 300_000 ? minInsuredBenefitPct(planLimit) : 1
  const showMinHint = planLimit >= 300_000 && minPct > 1

  const update = <K extends keyof BorrowerInput>(field: K, value: BorrowerInput[K]) =>
    onChange({ ...borrower, [field]: value })

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-td-green text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-gray-700">Borrower {index + 1}</span>
        </div>
        {total > 1 && (
          <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 transition">
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Current Age</Label>
          <input
            type="number"
            className={inputClass}
            value={age || ''}
            min={18}
            max={69}
            placeholder="e.g. 34"
            onChange={(e) => {
              const newAge = Number(e.target.value)
              const next = { ...borrower, age: newAge }
              if (newAge > 55) next.hasCriticalIllness = false
              onChange(next)
            }}
          />
          <p className="text-gray-400 text-xs mt-1">Life: 18–69 · CI: 18–55</p>
          <FieldError errors={errors} field={`${prefix}age`} />
        </div>

        <div>
          <Label required>Coverage</Label>
          <div className="space-y-2 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`${prefix}coverage`}
                checked={!borrower.hasCriticalIllness}
                onChange={() => update('hasCriticalIllness', false)}
                className="accent-td-green"
              />
              <span className="text-sm">Life only</span>
            </label>
            <label className={`flex items-center gap-2 ${ciDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name={`${prefix}coverage`}
                checked={borrower.hasCriticalIllness}
                disabled={ciDisabled}
                onChange={() => update('hasCriticalIllness', true)}
                className="accent-td-green"
              />
              <span className="text-sm">Life + CI</span>
            </label>
            {ciDisabled && age > 0 && (
              <p className="text-amber-600 text-xs">CI not available (age {age > 55 ? '> 55' : '< 18'})</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3">
        {partialNotAvailable ? (
          <p className="text-xs text-gray-400 italic">
            Partial coverage not available — plan limit is below $300,000.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleAdvanced}
              className="text-xs text-td-green hover:underline flex items-center gap-1"
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              Partial Coverage (Insured Benefit %)
            </button>
            {showAdvanced && (
              <div className="mt-2 pl-3 border-l-4 border-td-green-muted">
                <Label>Insured Benefit %</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-td-green"
                    value={borrower.insuredBenefitPct}
                    min={minPct}
                    max={100}
                    onChange={(e) => update('insuredBenefitPct', Number(e.target.value))}
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
                {showMinHint ? (
                  <p className="text-gray-400 text-xs mt-1">Minimum {minPct}% — ensures at least $300,000 insured.</p>
                ) : (
                  <p className="text-gray-400 text-xs mt-1">Default 100%. Change only for partial coverage approvals.</p>
                )}
                <FieldError errors={errors} field={`${prefix}insuredPct`} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Term Portion Card ─────────────────────────────────────────────────────────

interface TermPortionCardProps {
  index: number
  count: number
  tp: TermPortionInput
  borrowers: BorrowerInput[]
  errors: ValidationError[]
  onAmountChange: (value: number) => void
  onAgeChange: (borrowerIndex: number, value: number) => void
  onRemove: () => void
}

function TermPortionCard({
  index,
  count,
  tp,
  borrowers,
  errors,
  onAmountChange,
  onAgeChange,
  onRemove,
}: TermPortionCardProps) {
  const isMulti = borrowers.length > 1

  // Check if any borrower had a historical start (age at start < current age)
  const isHistorical = borrowers.some((b, j) => {
    const ageAtStart = tp.agesAtTermStart[j]
    return ageAtStart > 0 && b.age > 0 && ageAtStart < b.age
  })

  return (
    <div className="mb-3 pl-3 border-l-4 border-td-green-muted bg-gray-50 rounded-r-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">
          {count > 1 ? `Term Portion ${index + 1}` : 'Term Portion'}
        </span>
        <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Initial Amount */}
        <div>
          <Label required>Initial Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              className={dollarInputClass}
              value={tp.initialAmount || ''}
              min={0}
              placeholder="0"
              onChange={(e) => onAmountChange(Number(e.target.value))}
            />
          </div>
          <FieldError errors={errors} field={`tp.${index}.amount`} />
        </div>

        {/* Age(s) at term start */}
        <div>
          <Label required>{isMulti ? 'Ages at Term Start' : 'Age When Term Started'}</Label>
          {isMulti ? (
            <div className="space-y-2">
              {borrowers.map((b, j) => {
                const ageAtStart = tp.agesAtTermStart[j] ?? 0
                const yearsAgo = b.age > 0 && ageAtStart > 0 && ageAtStart <= b.age
                  ? b.age - ageAtStart
                  : null
                return (
                  <div key={j}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-td-green text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {j + 1}
                      </span>
                      <input
                        type="number"
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-td-green focus:border-td-green transition"
                        value={ageAtStart || ''}
                        min={18}
                        max={69}
                        placeholder="e.g. 30"
                        onChange={(e) => onAgeChange(j, Number(e.target.value))}
                      />
                      {yearsAgo !== null && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{yearsAgo} yr{yearsAgo !== 1 ? 's' : ''} ago</span>
                      )}
                    </div>
                    <FieldError errors={errors} field={`tp.${index}.age.${j}`} />
                  </div>
                )
              })}
              <p className="text-gray-400 text-xs mt-1">Rate locked at each borrower's age when coverage began.</p>
            </div>
          ) : (
            <>
              <input
                type="number"
                className={inputClass}
                value={tp.agesAtTermStart[0] || ''}
                min={18}
                max={69}
                placeholder="e.g. 30"
                onChange={(e) => onAgeChange(0, Number(e.target.value))}
              />
              {(() => {
                const ageAtStart = tp.agesAtTermStart[0]
                const currentAge = borrowers[0]?.age
                const yearsAgo = currentAge > 0 && ageAtStart > 0 && ageAtStart <= currentAge
                  ? currentAge - ageAtStart
                  : null
                return (
                  <p className="text-gray-400 text-xs mt-1">
                    {yearsAgo !== null ? `${yearsAgo} yr${yearsAgo !== 1 ? 's' : ''} ago · ` : ''}Rate fixed at this age.
                  </p>
                )
              })()}
              <FieldError errors={errors} field={`tp.${index}.age.0`} />
            </>
          )}
        </div>
      </div>

      {/* Historical term disclaimer */}
      {isHistorical && (
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-amber-700 text-xs leading-relaxed">
            This term portion began before the borrower's current age. Premiums are calculated
            using today's published rate table at the entered age when coverage began — actual
            billed amounts may vary slightly if rates have changed since the term started.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export default function CalculatorForm({ onCalculate, onReset }: Props) {
  const [form, setForm] = useState<CalculatorInput>(DEFAULT_STATE)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [showAdvanced, setShowAdvanced] = useState<boolean[]>([false])

  // ── Plan limit change ────────────────────────────────────────────────────
  const handlePlanLimitChange = (newLimit: number) => {
    let updatedBorrowers = form.borrowers
    let updatedShowAdvanced = showAdvanced

    if (newLimit > 0 && newLimit < 300_000) {
      updatedBorrowers = form.borrowers.map((b) => ({ ...b, insuredBenefitPct: 100 }))
      updatedShowAdvanced = showAdvanced.map(() => false)
      setShowAdvanced(updatedShowAdvanced)
    }

    setForm((prev) => ({ ...prev, planLimit: newLimit, borrowers: updatedBorrowers }))
  }

  // ── Borrower helpers ─────────────────────────────────────────────────────
  const addBorrower = () => {
    if (form.borrowers.length >= 4) return
    setForm((prev) => ({
      ...prev,
      borrowers: [...prev.borrowers, { ...DEFAULT_BORROWER }],
      // Keep term portion age arrays in sync — add a slot for the new borrower
      termPortions: prev.termPortions.map((tp) => ({
        ...tp,
        agesAtTermStart: [...tp.agesAtTermStart, 0],
      })),
    }))
    setShowAdvanced((prev) => [...prev, false])
  }

  const removeBorrower = (i: number) => {
    setForm((prev) => ({
      ...prev,
      borrowers: prev.borrowers.filter((_, idx) => idx !== i),
      // Remove the corresponding age slot from each term portion
      termPortions: prev.termPortions.map((tp) => ({
        ...tp,
        agesAtTermStart: tp.agesAtTermStart.filter((_, idx) => idx !== i),
      })),
    }))
    setShowAdvanced((prev) => prev.filter((_, idx) => idx !== i))
  }

  const updateBorrower = (i: number, updated: BorrowerInput) =>
    setForm((prev) => ({
      ...prev,
      borrowers: prev.borrowers.map((b, idx) => (idx === i ? updated : b)),
    }))

  const toggleAdvanced = (i: number) =>
    setShowAdvanced((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  // ── Term portion helpers ─────────────────────────────────────────────────
  const addTermPortion = () =>
    setForm((prev) => ({
      ...prev,
      termPortions: [
        ...prev.termPortions,
        {
          initialAmount: 0,
          agesAtTermStart: new Array(prev.borrowers.length).fill(0),
        },
      ],
    }))

  const removeTermPortion = (i: number) =>
    setForm((prev) => ({
      ...prev,
      termPortions: prev.termPortions.filter((_, idx) => idx !== i),
    }))

  const updateTermPortionAmount = (i: number, value: number) =>
    setForm((prev) => ({
      ...prev,
      termPortions: prev.termPortions.map((tp, idx) =>
        idx === i ? { ...tp, initialAmount: value } : tp,
      ),
    }))

  const updateTermPortionAge = (tpIndex: number, borrowerIndex: number, value: number) =>
    setForm((prev) => ({
      ...prev,
      termPortions: prev.termPortions.map((tp, idx) => {
        if (idx !== tpIndex) return tp
        const newAges = [...tp.agesAtTermStart]
        newAges[borrowerIndex] = value
        return { ...tp, agesAtTermStart: newAges }
      }),
    }))

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleCalculate = () => {
    const errs = validateInput(form)
    setErrors(errs)
    if (errs.length === 0) onCalculate(form)
  }

  const handleReset = () => {
    setForm(DEFAULT_STATE)
    setErrors([])
    setShowAdvanced([false])
    onReset()
  }

  const isMultiInsured = form.borrowers.length >= 2

  return (
    <div className="space-y-4">
      {/* ── Billing & Province ─────────────────────────────────────────────── */}
      <SectionCard title="Billing & Province">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Province</Label>
            <select
              className={inputClass}
              value={form.province}
              onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
            >
              <option value="">Select province…</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <FieldError errors={errors} field="province" />
          </div>
          <div>
            <Label required>Billing Period Days</Label>
            <input
              type="number"
              className={inputClass}
              value={form.billingDays || ''}
              min={28}
              max={31}
              onChange={(e) => setForm((prev) => ({ ...prev, billingDays: Number(e.target.value) }))}
            />
            <p className="text-gray-400 text-xs mt-1">Typically 28–31 days</p>
            <FieldError errors={errors} field="billingDays" />
          </div>
        </div>
      </SectionCard>

      {/* ── FlexLine Details ───────────────────────────────────────────────── */}
      <SectionCard title="FlexLine Details">
        {/* Plan Limit */}
        <div className="mb-5">
          <Label required>Plan Limit</Label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              className={dollarInputClass}
              value={form.planLimit || ''}
              min={0}
              placeholder="e.g. 500000"
              onChange={(e) => handlePlanLimitChange(Number(e.target.value))}
            />
          </div>
          <p className="text-gray-400 text-xs mt-1">
            Total FlexLine credit limit. Term + revolving cannot exceed this amount.
          </p>
          <FieldError errors={errors} field="planLimit" />
        </div>

        {/* Term Portions */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Term Portions</span>
            <button
              type="button"
              onClick={addTermPortion}
              className="text-xs text-td-green border border-td-green rounded px-2 py-1 hover:bg-td-green-light transition"
            >
              + Add Term Portion
            </button>
          </div>

          {form.termPortions.length === 0 && (
            <p className="text-gray-400 text-xs italic">No term portions — revolving only.</p>
          )}

          {form.termPortions.map((tp, i) => (
            <TermPortionCard
              key={i}
              index={i}
              count={form.termPortions.length}
              tp={tp}
              borrowers={form.borrowers}
              errors={errors}
              onAmountChange={(v) => updateTermPortionAmount(i, v)}
              onAgeChange={(j, v) => updateTermPortionAge(i, j, v)}
              onRemove={() => removeTermPortion(i)}
            />
          ))}
        </div>

        {/* Revolving Portion */}
        <div>
          <Label>Revolving Portion — Average Daily Balance</Label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              className={dollarInputClass}
              value={form.revolvingBalance || ''}
              min={0}
              placeholder="0"
              onChange={(e) => setForm((prev) => ({ ...prev, revolvingBalance: Number(e.target.value) }))}
            />
          </div>
          <p className="text-gray-400 text-xs mt-1">Enter $0 if no revolving balance</p>
          <FieldError errors={errors} field="revolving" />
        </div>

        <FieldError errors={errors} field="coverage" />
        <FieldError errors={errors} field="totalLimit" />
      </SectionCard>

      {/* ── Borrowers ──────────────────────────────────────────────────────── */}
      <SectionCard title="Borrowers">
        <div className="space-y-3">
          {form.borrowers.map((b, i) => (
            <BorrowerCard
              key={i}
              index={i}
              total={form.borrowers.length}
              borrower={b}
              planLimit={form.planLimit}
              errors={errors}
              onChange={(updated) => updateBorrower(i, updated)}
              onRemove={() => removeBorrower(i)}
              showAdvanced={showAdvanced[i] ?? false}
              onToggleAdvanced={() => toggleAdvanced(i)}
            />
          ))}
        </div>

        {form.borrowers.length < 4 && (
          <button
            type="button"
            onClick={addBorrower}
            className="mt-3 w-full border-2 border-dashed border-td-green-muted text-td-green text-sm font-medium py-2 rounded-lg hover:border-td-green hover:bg-td-green-light transition"
          >
            + Add Borrower
          </button>
        )}

        {isMultiInsured && (
          <div className="mt-3 flex items-start gap-2 bg-td-green-light border border-td-green-muted rounded-lg px-3 py-2">
            <span className="text-td-green font-bold text-sm mt-0.5">✓</span>
            <p className="text-td-green text-xs">
              <strong>20% multi-insured discount</strong> will be applied to each borrower's premium
              ({form.borrowers.length} borrowers on this FlexLine)
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── Validation summary ─────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm font-medium">Please fix the following:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-red-600 text-xs">{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={handleCalculate}
          className="flex-1 bg-td-green text-white font-semibold py-3 rounded-lg hover:bg-td-green-dark transition focus:outline-none focus:ring-2 focus:ring-td-green focus:ring-offset-2"
        >
          Calculate Premium
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-3 border-2 border-td-green text-td-green font-semibold rounded-lg hover:bg-td-green-light transition focus:outline-none focus:ring-2 focus:ring-td-green focus:ring-offset-2"
        >
          Reset
        </button>
      </div>

      <p className="text-gray-400 text-xs leading-relaxed">
        This calculator is for internal advisor use only and provides an estimate based on the
        information entered. Actual premiums are determined at billing and may vary based on the
        exact insurance billing period. Coverage is subject to underwriting approval.
      </p>
    </div>
  )
}
