import { render, screen } from '@testing-library/react'
import ReservationsPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)
jest.mock('@/components/ProtectedRoute', () => ({ children }: { children: React.ReactNode }) => <>{children}</>)

jest.mock('@/services/api', () => ({
  reservationsAPI: {
    getMyReservations: jest.fn().mockResolvedValue([]),
    getReservationsForUser: jest.fn().mockResolvedValue([]),
  },
  placesAPI: { getById: jest.fn() },
  rentoallUsersAPI: { getById: jest.fn() },
  rentoallReviewsAPI: { getByReservation: jest.fn() },
}))

describe('Reservations Page', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('userId', '1')
    localStorage.setItem('authToken', 'token')
  })

  it('renders reservations page', async () => {
    render(<LanguageProvider><ReservationsPage /></LanguageProvider>)
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
