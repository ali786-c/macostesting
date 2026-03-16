import { render, screen } from '@testing-library/react'
import HomeLandingPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SearchProvider } from '@/contexts/SearchContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)
jest.mock('@/components/sections/mobile-footer', () => () => null)

jest.mock('@/lib/capacitor', () => ({
  isMobileOrCapacitor: jest.fn(() => false), // Desktop → affiche la landing
}))

function renderLanding() {
  return render(
    <LanguageProvider>
      <SearchProvider>
        <HomeLandingPage />
      </SearchProvider>
    </LanguageProvider>
  )
}

describe('Landing Page (/)', () => {
  it('renders landing on desktop', () => {
    renderLanding()
    expect(screen.getByText(/50 000\+ espaces disponibles/)).toBeInTheDocument()
  })

  it('has link to search-parkings', () => {
    renderLanding()
    const links = screen.getAllByRole('link', { name: /trouver mon espace|find.*space/i })
    expect(links.length).toBeGreaterThan(0)
  })
})
