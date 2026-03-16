import { render, screen } from '@testing-library/react'
import UserProfilePage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)
jest.mock('@/components/ProtectedRoute', () => ({ children }: { children: React.ReactNode }) => <>{children}</>)

jest.mock('@/services/api', () => ({
  rentoallUsersAPI: {
    getProfile: jest.fn().mockResolvedValue({
      id: 1,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@test.com',
      profilePicture: '',
    }),
  },
  reviewsAPI: { getReceivedReviews: jest.fn().mockResolvedValue([]) },
}))

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: jest.fn() }),
}))

describe('User Profile Page', () => {
  it('renders user profile when loaded', async () => {
    render(
      <LanguageProvider>
        <UserProfilePage />
      </LanguageProvider>
    )
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
