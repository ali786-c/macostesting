import { isCapacitor, getPlatform } from '../capacitor'

describe('capacitor - extended', () => {
  const win = typeof window !== 'undefined' ? window : ({} as Window)
  let savedCapacitor: unknown

  beforeEach(() => {
    savedCapacitor = (win as unknown as { Capacitor?: unknown }).Capacitor
  })

  afterEach(() => {
    ;(win as unknown as { Capacitor?: unknown }).Capacitor = savedCapacitor
  })

  describe('isCapacitor edge cases', () => {
    it('should handle Capacitor with undefined isNativePlatform', () => {
      ;(win as unknown as { Capacitor: object }).Capacitor = {}
      expect(isCapacitor()).toBe(false)
    })

    it('should handle Capacitor with null isNativePlatform', () => {
      ;(win as unknown as { Capacitor: { isNativePlatform: null } }).Capacitor = {
        isNativePlatform: null,
      }
      expect(isCapacitor()).toBe(false)
    })
  })

  describe('getPlatform edge cases', () => {
    it('should handle Capacitor with undefined getPlatform', () => {
      ;(win as unknown as { Capacitor: object }).Capacitor = {}
      expect(getPlatform()).toBe('web')
    })

    it('should handle Capacitor with getPlatform returning empty string', () => {
      ;(win as unknown as { Capacitor: { getPlatform: () => string } }).Capacitor = {
        getPlatform: () => '',
      }
      expect(getPlatform()).toBe('web')
    })
  })
})
