import { render, screen } from '@testing-library/react'
import MessagesPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)
jest.mock('@/components/ProtectedRoute', () => ({ children }: { children: React.ReactNode }) => <>{children}</>)

jest.mock('@/services/api', () => ({
  messagesAPI: {
    getConversations: jest.fn().mockResolvedValue([]),
    getMessages: jest.fn().mockResolvedValue([]),
    getUserMessages: jest.fn().mockResolvedValue([]),
    getConversation: jest.fn().mockResolvedValue([]),
  },
  placesAPI: { getById: jest.fn() },
  rentoallUsersAPI: { getById: jest.fn() },
  reservationsAPI: { getById: jest.fn() },
  reportingAPI: { report: jest.fn() },
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

describe('Messages Page', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('userId', '1')
    localStorage.setItem('authToken', 'token')
  })

  it('renders messages page when logged in', async () => {
    render(
      <LanguageProvider>
        <MessagesPage />
      </LanguageProvider>
    )
    await expect(screen.findByText('Messages')).resolves.toBeInTheDocument()
  })
})
