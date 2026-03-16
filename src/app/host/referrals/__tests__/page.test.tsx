import { render, screen } from '@testing-library/react'
import HostReferralsPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

jest.mock('@/services/api', () => ({
  referralsAPI: {
    getMyReferrals: jest.fn().mockResolvedValue([]),
    getMyAffiliates: jest.fn().mockResolvedValue([]),
    getAffiliationCodes: jest.fn().mockResolvedValue([]),
    getAffiliationStats: jest.fn().mockResolvedValue({
      referralCode: 'REF123',
      totalEarnings: 0,
    }),
  },
}))

describe('Host Referrals Page', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('userId', '1')
    localStorage.setItem('authToken', 'token')
  })

  it('renders referrals page', async () => {
    render(
      <LanguageProvider>
        <HostReferralsPage />
      </LanguageProvider>
    )
    await expect(screen.findByText(/Parrainages|parrainage/i)).resolves.toBeInTheDocument()
  })
})
