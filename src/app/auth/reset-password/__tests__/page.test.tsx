import { render, screen } from '@testing-library/react'
import ResetPassword from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/Header', () => () => <header data-testid="header" />)
jest.mock('@/components/Footer', () => () => <footer data-testid="footer" />)

jest.mock('@/services/api', () => ({
  rentoallUsersAPI: { resetPassword: jest.fn().mockResolvedValue({}) },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('?token=test-token-123'),
}))

describe('Reset Password Page', () => {
  it('renders reset password form', () => {
    render(
      <LanguageProvider>
        <ResetPassword />
      </LanguageProvider>
    )
    expect(screen.getAllByPlaceholderText(/mot de passe|password/i).length).toBeGreaterThanOrEqual(1)
  })
})
