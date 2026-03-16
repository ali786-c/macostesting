import { render, screen } from '@testing-library/react'
import MonCalendrierPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

jest.mock('@/services/api', () => ({
  placesAPI: {
    getOwnerCalendarOverview: jest.fn().mockResolvedValue([]),
    getPlaceAvailabilities: jest.fn().mockResolvedValue([]),
  },
}))

describe('Mon Calendrier Page', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('userMode', 'host')
    localStorage.setItem('userId', '1')
    localStorage.setItem('authToken', 'token')
  })

  it('renders calendar page', async () => {
    render(
      <LanguageProvider>
        <MonCalendrierPage />
      </LanguageProvider>
    )
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
