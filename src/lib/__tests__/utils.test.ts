import { cn, getCancellationPolicyText, epureAddress } from '../utils'

describe('epureAddress', () => {
  it('should return empty or invalid input as-is', () => {
    expect(epureAddress('')).toBe('')
    expect(epureAddress(null as any)).toBe(null)
    expect(epureAddress(undefined as any)).toBe(undefined)
  })

  it('should return short addresses as-is', () => {
    expect(epureAddress('Paris')).toBe('Paris')
    expect(epureAddress('10 rue test, Paris')).toBe('10 rue test Paris')
  })

  it('should epure verbose French addresses', () => {
    const long = '43, Rue Léon Blum, Cité Claveau, Bordeaux Maritime, Bordeaux, Gironde, Nouvelle-Aquitaine, France métropolitaine, 33300, France'
    expect(epureAddress(long)).toBe('43 Rue Léon Blum, 33300 Bordeaux')
  })

  it('should extract street and postal code', () => {
    const result = epureAddress('1 Place du Marché, Lyon, Rhône, 69002, France')
    expect(result).toContain('69002')
    expect(result).toContain('Place du Marché')
  })

  it('should trim whitespace', () => {
    expect(epureAddress('  Paris  ')).toBe('Paris')
  })
})

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('getCancellationPolicyText', () => {
  describe('with policy parameter', () => {
    it('should return correct text for FLEXIBLE policy', () => {
      expect(getCancellationPolicyText(undefined, 'FLEXIBLE')).toBe(
        "Annulation gratuite jusqu'à 24h avant"
      )
    })

    it('should return correct text for MODERATE policy', () => {
      expect(getCancellationPolicyText(undefined, 'MODERATE')).toBe(
        "Annulation gratuite jusqu'à 5 jours avant"
      )
    })

    it('should return correct text for STRICT policy', () => {
      expect(getCancellationPolicyText(undefined, 'STRICT')).toBe(
        "Annulation gratuite jusqu'à 14 jours avant"
      )
    })
  })

  describe('with days parameter', () => {
    it('should return "Annulation gratuite" for 0 days', () => {
      expect(getCancellationPolicyText(0)).toBe('Annulation gratuite')
    })

    it('should return "Non annulable" for -1 days', () => {
      expect(getCancellationPolicyText(-1)).toBe('Non annulable')
    })

    it('should return correct text for 1 day', () => {
      expect(getCancellationPolicyText(1)).toBe(
        "Annulation gratuite jusqu'à 1 jour avant"
      )
    })

    it('should return correct text for multiple days', () => {
      expect(getCancellationPolicyText(7)).toBe(
        "Annulation gratuite jusqu'à 7 jours avant"
      )
    })

    it('should return "Annulation gratuite" for undefined', () => {
      expect(getCancellationPolicyText(undefined)).toBe('Annulation gratuite')
    })

    it('should return "Annulation gratuite" for null', () => {
      expect(getCancellationPolicyText(null as any)).toBe('Annulation gratuite')
    })
  })

  describe('priority: policy over days', () => {
    it('should use policy when both are provided', () => {
      expect(getCancellationPolicyText(7, 'FLEXIBLE')).toBe(
        "Annulation gratuite jusqu'à 24h avant"
      )
    })
  })
})
