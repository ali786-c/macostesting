import { render, screen } from '@testing-library/react'
import ParametresPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)
jest.mock('@/components/ProtectedRoute', () => ({ children }: { children: React.ReactNode }) => <>{children}</>)

jest.mock('@/services/api', () => ({
  rentoallUsersAPI: {
    getProfile: jest.fn().mockResolvedValue({ firstName: 'Test', lastName: 'User', email: 'test@test.com' }),
    updateProfile: jest.fn().mockResolvedValue({}),
  },
  referralsAPI: { getAffiliationSummary: jest.fn().mockResolvedValue({}) },
  paymentsAPI: { getOwnerPayouts: jest.fn().mockResolvedValue([]) },
  contactAPI: { getContactRequests: jest.fn().mockResolvedValue([]) },
  getBaseURLForOAuth2: jest.fn(() => 'http://localhost:8080'),
}))

describe('Parametres Page', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('userId', '1')
    localStorage.setItem('authToken', 'token')
    localStorage.setItem('userMode', 'client')
  })

  it('renders parametres page', async () => {
    render(<LanguageProvider><ParametresPage /></LanguageProvider>)
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
