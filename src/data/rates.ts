// Monthly premium rates per $1,000 of single coverage
// Source: TD Certificate of Insurance, page 30

export const LIFE_RATES: Record<number, number> = {
  18: 0.10, 19: 0.10, 20: 0.10, 21: 0.10, 22: 0.10,
  23: 0.10, 24: 0.10, 25: 0.10, 26: 0.10, 27: 0.10,
  28: 0.10, 29: 0.10,
  30: 0.11, 31: 0.12, 32: 0.13, 33: 0.14, 34: 0.16,
  35: 0.17, 36: 0.19, 37: 0.20, 38: 0.22, 39: 0.24,
  40: 0.25, 41: 0.27, 42: 0.28, 43: 0.30, 44: 0.33,
  45: 0.35, 46: 0.38, 47: 0.40, 48: 0.43, 49: 0.45,
  50: 0.47, 51: 0.48, 52: 0.50, 53: 0.52, 54: 0.56,
  55: 0.61, 56: 0.65, 57: 0.70, 58: 0.74, 59: 0.79,
  60: 0.84, 61: 0.89, 62: 0.94, 63: 0.99, 64: 1.10,
  65: 1.21, 66: 1.33, 67: 1.44, 68: 1.55, 69: 1.66,
}

// Ages 56–69 marked * in product guide: available only under Recognition of Prior Coverage
export const CI_RATES: Record<number, number> = {
  18: 0.11, 19: 0.11, 20: 0.11, 21: 0.11, 22: 0.11,
  23: 0.11, 24: 0.11, 25: 0.11, 26: 0.11, 27: 0.11,
  28: 0.11, 29: 0.11,
  30: 0.13, 31: 0.15, 32: 0.16, 33: 0.18, 34: 0.19,
  35: 0.20, 36: 0.22, 37: 0.23, 38: 0.24, 39: 0.28,
  40: 0.31, 41: 0.35, 42: 0.38, 43: 0.42, 44: 0.46,
  45: 0.51, 46: 0.55, 47: 0.60, 48: 0.64, 49: 0.70,
  50: 0.77, 51: 0.83, 52: 0.90, 53: 0.96, 54: 1.11,
  55: 1.26, 56: 1.40, 57: 1.55, 58: 1.70, 59: 1.79,
  60: 1.89, 61: 1.98, 62: 2.08, 63: 2.17, 64: 2.23,
  65: 2.30, 66: 2.36, 67: 2.43, 68: 2.49, 69: 2.55,
}

export function getLifeRate(age: number): number {
  return LIFE_RATES[age] ?? 0
}

export function getCiRate(age: number): number {
  return CI_RATES[age] ?? 0
}

// Provincial sales tax rates on insurance premiums
export const PROVINCIAL_TAX_RATES: Record<string, number> = {
  'Alberta': 0,
  'British Columbia': 0,
  'Manitoba': 0.07,
  'New Brunswick': 0,
  'Newfoundland and Labrador': 0,
  'Northwest Territories': 0,
  'Nova Scotia': 0,
  'Nunavut': 0,
  'Ontario': 0.08,
  'Prince Edward Island': 0,
  'Quebec': 0.09,
  'Saskatchewan': 0,
  'Yukon': 0,
}

export const PROVINCES = Object.keys(PROVINCIAL_TAX_RATES).sort()
