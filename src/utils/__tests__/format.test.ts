/**
 * Tests unitaires pour les fonctions de formatage
 * (prix, dates, calculs)
 */

// Format prix : cents → euros
export function formatPrice(cents: number): string {
  const euros = cents / 100
  return `${euros.toFixed(2)} €`
}

// Format prix depuis euros directement
export function formatPriceFromEuros(euros: number): string {
  return `${euros.toFixed(2)} €`
}

// Format date pour affichage
export function formatDate(date: Date | string, locale: string = 'fr-FR'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Format date avec heure
export function formatDateTime(date: Date | string, locale: string = 'fr-FR'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Calculer le total avec frais de service (8%)
export function calculateTotalWithFees(basePrice: number, serviceFeePercent: number = 8): number {
  const serviceFee = basePrice * (serviceFeePercent / 100)
  return basePrice + serviceFee
}

// Calculer les frais de plateforme
export function calculatePlatformFees(basePrice: number, feePercent: number = 8): number {
  return basePrice * (feePercent / 100)
}

describe('formatPrice', () => {
  it('should format cents to euros correctly', () => {
    expect(formatPrice(1000)).toBe('10.00 €')
    expect(formatPrice(1999)).toBe('19.99 €')
    expect(formatPrice(0)).toBe('0.00 €')
  })

  it('should handle decimal cents', () => {
    expect(formatPrice(1234)).toBe('12.34 €')
  })
})

describe('formatPriceFromEuros', () => {
  it('should format euros correctly', () => {
    expect(formatPriceFromEuros(10)).toBe('10.00 €')
    expect(formatPriceFromEuros(19.99)).toBe('19.99 €')
    expect(formatPriceFromEuros(0)).toBe('0.00 €')
  })

  it('should handle large amounts', () => {
    expect(formatPriceFromEuros(1000)).toBe('1000.00 €')
  })
})

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15')
    expect(formatDate(date)).toBe('15/01/2024')
  })

  it('should format date string', () => {
    expect(formatDate('2024-01-15')).toBe('15/01/2024')
  })

  it('should handle different locales', () => {
    const date = new Date('2024-01-15')
    expect(formatDate(date, 'en-US')).toBe('01/15/2024')
  })
})

describe('formatDateTime', () => {
  it('should format date and time correctly', () => {
    const date = new Date('2024-01-15T14:30:00')
    const formatted = formatDateTime(date)
    expect(formatted).toContain('15/01/2024')
    expect(formatted).toContain('14:30')
  })
})

describe('calculateTotalWithFees', () => {
  it('should calculate total with default 8% fee', () => {
    expect(calculateTotalWithFees(100)).toBe(108)
  })

  it('should calculate total with custom fee percentage', () => {
    expect(calculateTotalWithFees(100, 10)).toBe(110)
  })

  it('should handle zero base price', () => {
    expect(calculateTotalWithFees(0)).toBe(0)
  })
})

describe('calculatePlatformFees', () => {
  it('should calculate platform fees correctly', () => {
    expect(calculatePlatformFees(100)).toBe(8)
    expect(calculatePlatformFees(100, 10)).toBe(10)
  })

  it('should handle zero base price', () => {
    expect(calculatePlatformFees(0)).toBe(0)
  })
})
