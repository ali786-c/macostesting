import { render, screen, fireEvent } from '@testing-library/react'
import LoginRequiredModal from '../LoginRequiredModal'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('LoginRequiredModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', search: '' },
      writable: true,
    })
  })

  it('should not render when isOpen is false', () => {
    render(<LoginRequiredModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Connexion requise')).not.toBeInTheDocument()
  })

  it('should render default title and message when isOpen', () => {
    render(<LoginRequiredModal {...defaultProps} />)
    expect(screen.getByText('Connexion requise')).toBeInTheDocument()
    expect(screen.getByText(/Vous devez être connecté/)).toBeInTheDocument()
  })

  it('should render custom title and message', () => {
    render(
      <LoginRequiredModal
        {...defaultProps}
        title="Accès réservé"
        message="Connectez-vous pour continuer."
      />
    )
    expect(screen.getByText('Accès réservé')).toBeInTheDocument()
    expect(screen.getByText('Connectez-vous pour continuer.')).toBeInTheDocument()
  })

  it('should have Se connecter button', () => {
    render(<LoginRequiredModal {...defaultProps} />)
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
  })

  it('should have Créer un compte button', () => {
    render(<LoginRequiredModal {...defaultProps} />)
    expect(screen.getByText('Créer un compte')).toBeInTheDocument()
  })

  it('should navigate to login when Se connecter is clicked', () => {
    render(<LoginRequiredModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Se connecter'))
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  it('should navigate to signup when Créer un compte is clicked', () => {
    render(<LoginRequiredModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Créer un compte'))
    expect(mockPush).toHaveBeenCalledWith('/auth/signup')
  })

  it('should save redirect URL to sessionStorage when Se connecter is clicked', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
    render(<LoginRequiredModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Se connecter'))
    expect(setItemSpy).toHaveBeenCalledWith('redirectAfterLogin', expect.any(String))
  })
})
