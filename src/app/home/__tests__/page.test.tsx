import { render, screen } from '@testing-library/react'
import HomePage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)
jest.mock('@/components/sections/mobile-footer', () => () => null)
jest.mock('@/components/sections/featured-spaces-section', () => () => <div data-testid="featured" />)

jest.mock('@/lib/capacitor', () => ({
  isMobileOrCapacitor: jest.fn(() => false), // Desktop → affiche le dashboard
}))

jest.mock('@/services/api', () => ({
  placesAPI: {
    search: jest.fn().mockResolvedValue([]),
    getOwnerCalendarOverview: jest.fn().mockResolvedValue([]),
  },
  reservationsAPI: {
    getReservationsForOwner: jest.fn().mockResolvedValue([]),
    getReservationsForUser: jest.fn().mockResolvedValue([]),
    getOwnerStats: jest.fn().mockResolvedValue({ totalPlaces: 0, activeReservations: 0 }),
  },
}))

describe('Home Page (/home)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('userMode', 'client')
    localStorage.setItem('userId', '1')
    localStorage.setItem('authToken', 'token')
  })

  it('renders home dashboard on desktop', async () => {
    render(<LanguageProvider><HomePage /></LanguageProvider>)
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
