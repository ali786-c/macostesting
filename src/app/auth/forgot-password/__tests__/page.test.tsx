import { render, screen } from '@testing-library/react'
import ForgotPasswordPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('Forgot Password Page', () => {
  it('renders forgot password form', () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByPlaceholderText(/email|adresse/i)).toBeInTheDocument()
  })

  it('has submit button', () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByRole('button', { name: /envoyer|réinitialiser|récupérer/i })).toBeInTheDocument()
  })
})
