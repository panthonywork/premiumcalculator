export default function Header() {
  return (
    <header className="bg-td-green shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
        {/* TD shield inlined as JSX so single-file builds have zero external assets. */}
        <svg
          viewBox="0 0 80 90"
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-10 flex-shrink-0"
          aria-label="TD"
        >
          <path d="M40 4 L76 20 L76 56 Q76 76 40 86 Q4 76 4 56 L4 20 Z" fill="#00843D" />
          <text
            x="40"
            y="58"
            fontFamily="Arial, sans-serif"
            fontSize="28"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
          >
            TD
          </text>
        </svg>
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
