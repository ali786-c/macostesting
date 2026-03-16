import { render, screen } from '@testing-library/react'
import FavorisPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)
jest.mock('@/components/ProtectedRoute', () => ({ children }: { children: React.ReactNode }) => <>{children}</>)

jest.mock('@/services/api', () => ({
  rentoallFavoritesAPI: { getFavorites: jest.fn().mockResolvedValue([]) },
}))

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  usePathname: () => '/favoris',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Favoris Page', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('userMode', 'client')
    localStorage.setItem('userId', '1')
    localStorage.setItem('authToken', 'token')
  })

  it('renders favoris page', async () => {
    render(<LanguageProvider><FavorisPage /></LanguageProvider>)
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
