import { render, screen } from '@testing-library/react'
import MyPlacesPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

jest.mock('@/services/api', () => ({
  rentoallUsersAPI: { getMyPlaces: jest.fn().mockResolvedValue([]) },
  reservationsAPI: { getPendingCountByPlace: jest.fn().mockResolvedValue({}) },
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/host/my-places',
}))

describe('Host My Places Page', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('userMode', 'host')
    localStorage.setItem('userId', '1')
    localStorage.setItem('authToken', 'token')
  })

  it('renders my places page when host', async () => {
    render(<LanguageProvider><MyPlacesPage /></LanguageProvider>)
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
