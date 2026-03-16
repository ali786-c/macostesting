/**
 * Tests unitaires pour les validateurs
 * (email, password, champs de formulaire)
 */

// Validateur email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

// Validateur password (minimum 8 caractères, au moins une majuscule, une minuscule, un chiffre)
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

// Validateur code postal français
export function isValidFrenchZipCode(zipCode: string): boolean {
  const zipCodeRegex = /^\d{5}$/
  return zipCodeRegex.test(zipCode.trim())
}

// Validateur téléphone français
export function isValidFrenchPhone(phone: string): boolean {
  const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[.\s-]?\d{2}){4}$/
  return phoneRegex.test(phone.trim().replace(/\s/g, ''))
}

// Validateur SIRET
export function isValidSiret(siret: string): boolean {
  const siretRegex = /^\d{14}$/
  if (!siretRegex.test(siret.trim())) return false
  
  // Algorithme de Luhn pour valider le SIRET
  const digits = siret.trim().split('').map(Number)
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let digit = digits[i]
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

// Validateur URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

describe('isValidEmail', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('test+tag@example.com')).toBe(true)
  })

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('invalid@')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('invalid@.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('should trim whitespace', () => {
    expect(isValidEmail('  test@example.com  ')).toBe(true)
  })
})

describe('isValidPassword', () => {
  it('should validate strong passwords', () => {
    expect(isValidPassword('Password123')).toBe(true)
    expect(isValidPassword('MyStr0ng!Pass')).toBe(true)
  })

  it('should reject weak passwords', () => {
    expect(isValidPassword('short')).toBe(false) // too short
    expect(isValidPassword('nouppercase123')).toBe(false) // no uppercase
    expect(isValidPassword('NOLOWERCASE123')).toBe(false) // no lowercase
    expect(isValidPassword('NoNumbersHere')).toBe(false) // no numbers
    expect(isValidPassword('')).toBe(false) // empty
  })
})

describe('isValidFrenchZipCode', () => {
  it('should validate correct French zip codes', () => {
    expect(isValidFrenchZipCode('75001')).toBe(true)
    expect(isValidFrenchZipCode('13001')).toBe(true)
  })

  it('should reject invalid zip codes', () => {
    expect(isValidFrenchZipCode('1234')).toBe(false) // too short
    expect(isValidFrenchZipCode('123456')).toBe(false) // too long
    expect(isValidFrenchZipCode('ABCDE')).toBe(false) // letters
    expect(isValidFrenchZipCode('')).toBe(false) // empty
  })

  it('should trim whitespace', () => {
    expect(isValidFrenchZipCode('  75001  ')).toBe(true)
  })
})

describe('isValidFrenchPhone', () => {
  it('should validate correct French phone numbers', () => {
    expect(isValidFrenchPhone('0612345678')).toBe(true)
    expect(isValidFrenchPhone('+33612345678')).toBe(true)
    expect(isValidFrenchPhone('0033612345678')).toBe(true)
    expect(isValidFrenchPhone('06 12 34 56 78')).toBe(true)
  })

  it('should reject invalid phone numbers', () => {
    expect(isValidFrenchPhone('123456789')).toBe(false) // too short
    expect(isValidFrenchPhone('0000000000')).toBe(false) // invalid: second digit must be 1-9
    expect(isValidFrenchPhone('')).toBe(false) // empty
  })
})

describe('isValidSiret', () => {
  it('should validate correct SIRET numbers', () => {
    // 00000000000000 : sum=0, Luhn valid (0 mod 10 = 0)
    expect(isValidSiret('00000000000000')).toBe(true)
  })

  it('should reject invalid SIRET numbers', () => {
    expect(isValidSiret('1234567890123')).toBe(false) // too short
    expect(isValidSiret('123456789012345')).toBe(false) // too long
    expect(isValidSiret('ABCDEFGHIJKLMN')).toBe(false) // letters
    // 11111111111111 fails Luhn (sum mod 10 !== 0)
    expect(isValidSiret('11111111111111')).toBe(false) // invalid Luhn
  })
})

describe('isValidUrl', () => {
  it('should validate correct URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('https://www.example.com/path?query=1')).toBe(true)
  })

  it('should reject invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false)
    expect(isValidUrl('example.com')).toBe(false) // missing protocol
    expect(isValidUrl('')).toBe(false) // empty
  })
})
