import { render, screen, fireEvent } from '@testing-library/react'
import MobileFooter from '../mobile-footer'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/search-parkings'),
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@/services/api', () => ({
  messagesAPI: {
    getUnreadCount: jest.fn().mockResolvedValue(0),
  },
}))

jest.mock('@/lib/capacitor', () => ({
  isCapacitor: jest.fn(() => true), // Simulate native for navigation test
}))

describe('MobileFooter', () => {
  const originalLocalStorage = window.localStorage

  beforeEach(() => {
    mockPush.mockClear()
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => {
          if (key === 'userMode') return 'client'
          if (key === 'userId') return '1'
          if (key === 'authToken') return 'token'
          return null
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage })
  })

  it('should render client menu items', () => {
    render(<MobileFooter />)
    expect(screen.getByLabelText('Rechercher')).toBeInTheDocument()
    expect(screen.getByLabelText('Réservations')).toBeInTheDocument()
    expect(screen.getByLabelText('Messagerie')).toBeInTheDocument()
    expect(screen.getByLabelText('Favoris')).toBeInTheDocument()
    expect(screen.getByLabelText('Profil')).toBeInTheDocument()
  })

  it('should navigate when tapping an item (Capacitor mode)', async () => {
    const { isCapacitor } = require('@/lib/capacitor')
    ;(isCapacitor as jest.Mock).mockReturnValue(true)
    render(<MobileFooter />)
    fireEvent.click(screen.getByLabelText('Favoris'))
    expect(mockPush).toHaveBeenCalledWith('/favoris')
  })

  it('should have correct aria-current for active item', () => {
    render(<MobileFooter />)
    const searchButton = screen.getByLabelText('Rechercher')
    expect(searchButton).toHaveAttribute('aria-current', 'page')
  })

  it('should have safe area and touch-friendly nav', () => {
    const { container } = render(<MobileFooter />)
    const footer = container.querySelector('footer')
    expect(footer).toHaveClass('md:hidden')
    expect(footer?.style.paddingBottom).toBeDefined()
    const nav = screen.getByRole('navigation', { name: /principale/i })
    expect(nav).toBeInTheDocument()
  })
})
