import { isCapacitor, getPlatform, isMobileOrCapacitor } from '../capacitor'

describe('capacitor', () => {
  const win = typeof window !== 'undefined' ? window : ({} as Window)
  let savedCapacitor: unknown

  beforeEach(() => {
    savedCapacitor = (win as unknown as { Capacitor?: unknown }).Capacitor
  })

  afterEach(() => {
    ;(win as unknown as { Capacitor?: unknown }).Capacitor = savedCapacitor
  })

  describe('isCapacitor', () => {
    it('should return false when Capacitor is not present', () => {
      delete (win as unknown as { Capacitor?: unknown }).Capacitor
      expect(isCapacitor()).toBe(false)
    })

    it('should return false when isNativePlatform returns false', () => {
      ;(win as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = {
        isNativePlatform: () => false,
      }
      expect(isCapacitor()).toBe(false)
    })

    it('should return true when isNativePlatform returns true', () => {
      ;(win as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = {
        isNativePlatform: () => true,
      }
      expect(isCapacitor()).toBe(true)
    })
  })

  describe('isMobileOrCapacitor', () => {
    const origInnerWidth = window.innerWidth
    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: origInnerWidth, configurable: true })
    })
    it('should return true when viewport < 768', () => {
      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
      delete (win as unknown as { Capacitor?: unknown }).Capacitor
      expect(isMobileOrCapacitor()).toBe(true)
    })
    it('should return false when viewport >= 768 and not Capacitor', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
      delete (win as unknown as { Capacitor?: unknown }).Capacitor
      expect(isMobileOrCapacitor()).toBe(false)
    })
    it('should return true when Capacitor native even with wide viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
      ;(win as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = {
        isNativePlatform: () => true,
      }
      expect(isMobileOrCapacitor()).toBe(true)
    })
  })

  describe('getPlatform', () => {
    it('should return "web" when Capacitor is not present', () => {
      delete (win as unknown as { Capacitor?: unknown }).Capacitor
      expect(getPlatform()).toBe('web')
    })

    it('should return "ios" when getPlatform returns "ios"', () => {
      ;(win as unknown as { Capacitor: { getPlatform: () => string } }).Capacitor = {
        getPlatform: () => 'ios',
      }
      expect(getPlatform()).toBe('ios')
    })

    it('should return "android" when getPlatform returns "android"', () => {
      ;(win as unknown as { Capacitor: { getPlatform: () => string } }).Capacitor = {
        getPlatform: () => 'android',
      }
      expect(getPlatform()).toBe('android')
    })

    it('should return "web" for unknown platform', () => {
      ;(win as unknown as { Capacitor: { getPlatform: () => string } }).Capacitor = {
        getPlatform: () => 'unknown',
      }
      expect(getPlatform()).toBe('web')
    })
  })
})
