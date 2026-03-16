/**
 * Tests d'intégration pour la page de signup
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignupPage from '../signup/page'
import { LanguageProvider } from '@/contexts/LanguageContext'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/auth/signup',
  useSearchParams: () => new URLSearchParams(),
}))

// Mocks pour simplifier les tests (éviter dépendances Header/Footer avec SearchProvider, etc.)
jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header-mock" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer-mock" />)

function renderSignup() {
  return render(
    <LanguageProvider>
      <SignupPage />
    </LanguageProvider>
  )
}

describe('Signup Page Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockClear()
  })

  it('should render signup form', () => {
    renderSignup()
    expect(screen.getByPlaceholderText(/adresse email|email address/i)).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/mot de passe|password/i).length).toBeGreaterThanOrEqual(1)
  })

  it.skip('should show validation errors for empty fields', async () => {
    renderSignup()
    
    const submitButton = screen.getByRole('button', { name: /créer mon compte|s'inscrire|créer un compte/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/obligatoire|required/i)).toBeInTheDocument()
    })
  })

  it.skip('should submit form successfully with valid data', async () => {
    renderSignup()
    
    fireEvent.change(screen.getByPlaceholderText(/adresse email|email address/i), {
      target: { value: 'test@example.com' },
    })
    const pwdInputs = screen.getAllByPlaceholderText(/mot de passe|password/i)
    fireEvent.change(pwdInputs[0], { target: { value: 'Password123' } })
    const firstNameInputs = screen.getAllByPlaceholderText(/prénom|first name/i)
    const lastNameInputs = screen.getAllByPlaceholderText(/nom|last name/i)
    fireEvent.change(firstNameInputs[0], { target: { value: 'John' } })
    fireEvent.change(lastNameInputs[0], { target: { value: 'Doe' } })
    fireEvent.change(pwdInputs[1], { target: { value: 'Password123' } })

    const submitButton = screen.getByRole('button', { name: /créer mon compte|create my account|s'inscrire/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login?welcome=true')
    }, { timeout: 5000 })
  })

  it.skip('should show error when email already exists', async () => {
    renderSignup()
    
    fireEvent.change(screen.getByPlaceholderText(/adresse email|email address/i), {
      target: { value: 'existing@test.com' },
    })
    const firstNameInputs = screen.getAllByPlaceholderText(/prénom|first name/i)
    const lastNameInputs = screen.getAllByPlaceholderText(/nom|last name/i)
    fireEvent.change(firstNameInputs[0], { target: { value: 'John' } })
    fireEvent.change(lastNameInputs[0], { target: { value: 'Doe' } })
    const pwdInputs = screen.getAllByPlaceholderText(/mot de passe|password/i)
    fireEvent.change(pwdInputs[0], { target: { value: 'Password123' } })
    fireEvent.change(pwdInputs[1], { target: { value: 'Password123' } })

    const submitButton = screen.getByRole('button', { name: /créer mon compte|s'inscrire|créer un compte/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/already exists|déjà utilisé|already used|email already exists/i)).toBeInTheDocument()
    }, { timeout: 5000 })
  })
})
