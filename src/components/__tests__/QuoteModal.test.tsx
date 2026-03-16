import { render, screen, fireEvent } from '@testing-library/react'
import QuoteModal from '@/components/conversations/QuoteModal'

describe('QuoteModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    form: {
      title: '',
      description: '',
      price: '',
      duration: '',
    },
    onFormChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<QuoteModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Envoyer un devis')).not.toBeInTheDocument()
  })

  it('should render form fields when open', () => {
    render(<QuoteModal {...defaultProps} />)
    expect(screen.getByText('Envoyer un devis')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Collaboration 3 stories/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('2000')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ex: 7 jours')).toBeInTheDocument()
  })

  it('should call onFormChange when inputs change', () => {
    render(<QuoteModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Collaboration 3 stories/), {
      target: { value: 'Nouveau titre' },
    })
    expect(defaultProps.onFormChange).toHaveBeenCalled()
  })

  it('should call onSubmit when form is valid and Envoyer is clicked', () => {
    render(
      <QuoteModal
        {...defaultProps}
        form={{
          title: 'Devis test',
          description: '',
          price: '100',
          duration: '7 jours',
        }}
      />
    )
    fireEvent.click(screen.getByText('Envoyer le devis'))
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('should disable Envoyer button when form is incomplete', () => {
    render(<QuoteModal {...defaultProps} />)
    // Form has empty title, price, duration - button should be disabled
    const submitBtn = screen.getByText('Envoyer le devis')
    expect(submitBtn).toBeDisabled()
  })

  it('should call onClose when Annuler is clicked', () => {
    render(<QuoteModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Annuler'))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
