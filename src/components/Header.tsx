export default function Header() {
  return (
    <header className="bg-td-green shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
        <img src="/td-shield.svg" alt="TD" className="h-12 w-10 flex-shrink-0" />
        <div>
          <h1 className="text-white text-xl font-bold leading-tight">
            FlexLine Protection Plan
          </h1>
          <p className="text-green-100 text-sm">
            Premium Quote Calculator — Advisor Use Only
          </p>
        </div>
      </div>
    </header>
  )
}
