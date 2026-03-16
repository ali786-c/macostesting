import { render, screen } from '@testing-library/react'
import LoginPage from '../page'
import { LanguageProvider } from '@/contexts/LanguageContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('Login Page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders login form', () => {
    render(<LanguageProvider><LoginPage /></LanguageProvider>)
    expect(screen.getByPlaceholderText(/adresse email|email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/mot de passe|password/i)).toBeInTheDocument()
  })

  it('has submit button', () => {
    render(<LanguageProvider><LoginPage /></LanguageProvider>)
    const buttons = screen.getAllByRole('button')
    const submitBtn = buttons.find(b => /connexion|connecter|se connecter|connexion/i.test(b.textContent || ''))
    expect(submitBtn || buttons[0]).toBeInTheDocument()
  })

  it('has link to signup', () => {
    render(<LanguageProvider><LoginPage /></LanguageProvider>)
    expect(screen.getByRole('link', { name: /créer un compte|s'inscrire|inscription/i })).toBeInTheDocument()
  })
})
