import { useState } from 'react'
import Header from './components/Header'
import CalculatorForm from './components/CalculatorForm'
import ResultsPanel from './components/ResultsPanel'
import { CalculatorInput, CalculationResult } from './types'
import { calculatePremium } from './utils/calculator'

export default function App() {
  const [result, setResult] = useState<CalculationResult | null>(null)

  const handleCalculate = (input: CalculatorInput) => {
    setResult(calculatePremium(input))
  }

  const handleReset = () => {
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
          <CalculatorForm onCalculate={handleCalculate} onReset={handleReset} />
          <ResultsPanel result={result} />
        </div>
      </main>
    </div>
  )
}
