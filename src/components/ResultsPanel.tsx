import { useState, useEffect } from 'react'
import { CalculationResult, BorrowerResult, CoverageResult } from '../types'
import { formatCAD, formatPct } from '../utils/calculator'

interface Props {
  result: CalculationResult | null
}

// ── Chevron Icon ──────────────────────────────────────────────────────────────

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ── Rate Reduction Info Popup ────────────────────────────────────────────────

function RateReductionPopup({
  borrowerResults,
  onClose,
}: {
  borrowerResults: BorrowerResult[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-td-green-light flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-td-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h3 className="text-td-green font-bold text-base">Volume Rate Reduction</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4 flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Explanation */}
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          TD automatically applies a tiered volume discount to premiums when the total insured
          balance exceeds $150,000. It is already factored into all premiums shown — nothing
          extra needs to be done.
        </p>

        {/* Tier table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Balance Tier</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">Reduction on Slice</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="px-3 py-2 text-gray-700">$0 – $150,000</td>
                <td className="px-3 py-2 text-right text-gray-500">None</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-3 py-2 text-gray-700">$150,001 – $500,000</td>
                <td className="px-3 py-2 text-right font-medium text-gray-700">15%</td>
              </tr>
              <tr className="bg-white">
                <td className="px-3 py-2 text-gray-700">$500,001 – $1,000,000</td>
                <td className="px-3 py-2 text-right font-medium text-gray-700">35%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Example for this quote */}
        {borrowerResults.some((br) => br.rateReductionPct > 0) && (
          <div className="bg-td-green-light rounded-lg px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-td-green mb-2">Applied in this quote:</p>
            <div className="space-y-1">
              {borrowerResults.map((br, i) => (
                <p key={i} className="text-xs text-gray-700">
                  <span className="font-medium">{br.label || 'Borrower'}</span>
                  {' — '}insured balance {formatCAD(br.totalInsuredBalance)}{' → '}
                  <span className="font-semibold text-td-green">
                    {formatPct(br.rateReductionPct)} effective reduction
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}

        {borrowerResults.every((br) => br.rateReductionPct === 0) && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-gray-500">
              No reduction applies in this quote — the insured balance is $150,000 or below.
            </p>
          </div>
        )}

        <p className="text-gray-400 text-xs">
          Source: TD Certificate of Insurance, pages 27–39
        </p>
      </div>
    </div>
  )
}

// ── Coverage Table ────────────────────────────────────────────────────────────

function CoverageTable({ coverage }: { coverage: CoverageResult }) {
  const isCI = coverage.type === 'Critical Illness Insurance'
  const headerColor = isCI ? 'bg-blue-50 text-blue-800' : 'bg-td-green-light text-td-green'
  const showDiscount = coverage.multiInsuredDiscountApplied

  return (
    <div className="mb-4 last:mb-0">
      <h4 className={`text-xs font-bold px-3 py-2 rounded-t-lg flex flex-wrap items-center gap-2 ${headerColor}`}>
        <span>{coverage.type}</span>
        {showDiscount && (
          <span className="font-normal bg-white/40 rounded px-1">−20% multi-insured discount applied</span>
        )}
      </h4>

      <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Portion</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Balance</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Rate/$1k</th>
              {showDiscount && (
                <th className="text-right px-3 py-2 font-medium text-gray-600">After 20% Discount</th>
              )}
              <th className="text-right px-3 py-2 font-medium text-gray-600 bg-gray-100">Monthly Premium</th>
            </tr>
          </thead>
          <tbody>
            {coverage.portions.map((p, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 font-medium text-gray-700">{p.label}</td>
                <td className="px-3 py-2 text-right text-gray-600">{formatCAD(p.balance)}</td>
                <td className="px-3 py-2 text-right text-gray-600">${p.rate.toFixed(2)}</td>
                {showDiscount && (
                  <td className="px-3 py-2 text-right text-gray-600">{formatCAD(p.afterMultiInsured)}</td>
                )}
                <td className="px-3 py-2 text-right font-medium text-gray-800 bg-gray-50">
                  {formatCAD(p.afterTax)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 bg-gray-50">
              <td colSpan={showDiscount ? 3 : 2} className="px-3 py-2 text-right text-xs text-gray-500">
                Before tax: {formatCAD(coverage.subtotalBeforeTax)}
                {coverage.taxAmount > 0 && <span> + PST: {formatCAD(coverage.taxAmount)}</span>}
              </td>
              <td className="px-3 py-2 text-right font-bold text-gray-800 bg-gray-100" colSpan={2}>
                {coverage.type.split(' ')[0]} Total: {formatCAD(coverage.total)}/mo
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Accordion Row ─────────────────────────────────────────────────────────────

function AccordionRow({
  label,
  sublabel,
  amount,
  expanded,
  onToggle,
  children,
  accent,
}: {
  label: string
  sublabel?: string
  amount: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
  accent?: 'green' | 'blue'
}) {
  const accentColor = accent === 'blue' ? 'text-blue-700' : 'text-td-green'
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2 last:mb-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <span className={`text-sm font-semibold ${accentColor}`}>{label}</span>
            {sublabel && (
              <span className="text-xs text-gray-400 font-normal ml-2">{sublabel}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <span className="text-sm font-bold text-gray-800">{amount}/mo</span>
          <ChevronIcon expanded={expanded} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function ResultsPanel({ result }: Props) {
  const [showRateInfo, setShowRateInfo] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Reset accordion whenever a new result arrives
  useEffect(() => {
    setExpanded({})
  }, [result])

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  const isOpen = (key: string) => expanded[key] ?? false

  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center text-center min-h-64">
        <div className="w-16 h-16 rounded-full bg-td-green-light flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-td-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm font-medium">Quote will appear here</p>
        <p className="text-gray-400 text-xs mt-1">Complete the form and click Calculate Premium</p>
      </div>
    )
  }

  const taxLabel = result.taxRate > 0 ? ` + ${(result.taxRate * 100).toFixed(0)}% PST` : ''
  const b1 = result.borrowerResults[0]

  return (
    <div className="space-y-4">
      {/* Rate reduction info popup */}
      {showRateInfo && (
        <RateReductionPopup
          borrowerResults={result.borrowerResults}
          onClose={() => setShowRateInfo(false)}
        />
      )}

      {/* Grand Total */}
      <div className="bg-td-green rounded-lg p-6 text-white shadow-md">
        <p className="text-green-100 text-sm font-medium mb-1">
          Estimated Monthly Premium{result.isMultiInsured ? ' — Combined' : ''}
        </p>
        <p className="text-4xl font-bold tracking-tight">{formatCAD(result.grandTotal)}</p>
        <p className="text-green-200 text-xs mt-2">
          {result.province} · {result.billingDays}-day billing period{taxLabel}
          {result.isMultiInsured &&
            ` · ${result.borrowerResults.length} borrowers · 20% multi-insured discount`}
        </p>
      </div>

      {/* Summary Bar */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600">
        {result.isMultiInsured ? (
          result.borrowerResults.map((br, i) => (
            <div key={i}>
              <span className="font-medium">B{i + 1} Insured Balance:</span>{' '}
              {formatCAD(br.totalInsuredBalance)}
            </div>
          ))
        ) : (
          <div>
            <span className="font-medium">Total Insured Balance:</span>{' '}
            {formatCAD(b1.totalInsuredBalance)}
          </div>
        )}
        {result.taxRate > 0 && (
          <div>
            <span className="font-medium">PST:</span> {(result.taxRate * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-td-green-muted">
          <h2 className="text-td-green font-semibold text-base">Premium Breakdown</h2>
          <button
            onClick={() => setShowRateInfo(true)}
            title="About volume rate reduction"
            className="w-6 h-6 rounded-full border border-gray-300 text-gray-400 hover:border-td-green hover:text-td-green transition flex items-center justify-center flex-shrink-0"
            aria-label="Volume rate reduction information"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {result.isMultiInsured ? (
          /* Multi-borrower: one accordion row per borrower */
          result.borrowerResults.map((br, i) => (
            <AccordionRow
              key={i}
              label={br.label}
              sublabel={`Age ${br.age} · Insured: ${formatCAD(br.totalInsuredBalance)}`}
              amount={formatCAD(br.subtotal)}
              expanded={isOpen(`b${i}`)}
              onToggle={() => toggle(`b${i}`)}
              accent="green"
            >
              {br.coverages.map((c, j) => (
                <CoverageTable key={j} coverage={c} />
              ))}
            </AccordionRow>
          ))
        ) : (
          /* Single borrower: one accordion row per coverage type */
          b1.coverages.map((c, j) => (
            <AccordionRow
              key={j}
              label={c.type}
              amount={formatCAD(c.total)}
              expanded={isOpen(`c${j}`)}
              onToggle={() => toggle(`c${j}`)}
              accent={c.type === 'Critical Illness Insurance' ? 'blue' : 'green'}
            >
              <CoverageTable coverage={c} />
            </AccordionRow>
          ))
        )}
      </div>

      {/* Historical term portions notice */}
      {result.hasHistoricalTermPortions && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-amber-700 text-xs leading-relaxed">
            <span className="font-semibold">Note — historical term portions:</span> One or more
            term portions began before the borrower's current age. Premiums for those portions are
            calculated using today's published rate table at the age when coverage began. If TD's
            rate table has changed since the term started, actual billed amounts may vary slightly
            from this estimate.
          </p>
        </div>
      )}

      {/* Disclosures */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-800 text-xs font-semibold mb-2">Important Disclosures</p>
        <ul className="text-amber-700 text-xs space-y-1 list-disc list-inside">
          <li>This estimate is for advisor use only. Actual premiums may vary based on the exact insurance billing period.</li>
          <li>Rates are per $1,000 of coverage per month. Provincial tax applied where applicable.</li>
          <li>Life Insurance provided by The Canada Life Assurance Company. Accidental dismemberment by TD Life Insurance Company.</li>
          <li>Coverage is subject to underwriting approval. Terms and conditions apply.</li>
          <li>Maximum combined coverage: $1,000,000 per coverage type.</li>
        </ul>
      </div>
    </div>
  )
}
