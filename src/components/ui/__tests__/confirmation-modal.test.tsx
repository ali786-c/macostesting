import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmationModal from '../confirmation-modal'

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    message: 'Voulez-vous vraiment supprimer ?',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Confirmation')).not.toBeInTheDocument()
  })

  it('should render default title and message', () => {
    render(<ConfirmationModal {...defaultProps} />)
    expect(screen.getByText('Confirmation')).toBeInTheDocument()
    expect(screen.getByText('Voulez-vous vraiment supprimer ?')).toBeInTheDocument()
  })

  it('should render custom title', () => {
    render(<ConfirmationModal {...defaultProps} title="Suppression" />)
    expect(screen.getByText('Suppression')).toBeInTheDocument()
  })

  it('should call onConfirm when confirm button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Confirmer'))
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when cancel button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Annuler'))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when close button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('should render custom confirm and cancel text', () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        confirmText="Oui, supprimer"
        cancelText="Non"
      />
    )
    expect(screen.getByText('Oui, supprimer')).toBeInTheDocument()
    expect(screen.getByText('Non')).toBeInTheDocument()
  })

  it('should show loading state on confirm button', () => {
    render(<ConfirmationModal {...defaultProps} isLoading />)
    expect(screen.getByText('Traitement...')).toBeInTheDocument()
  })

  it('should disable buttons when isLoading', () => {
    render(<ConfirmationModal {...defaultProps} isLoading />)
    expect(screen.getByText('Annuler')).toBeDisabled()
  })

  it('should render cancellation info when provided', () => {
    const cancellationInfo = {
      policy: 'Flexible',
      totalAmount: 100,
      isRefundable: true,
      refundAmount: 90,
    }
    render(
      <ConfirmationModal
        {...defaultProps}
        cancellationInfo={cancellationInfo}
      />
    )
    expect(screen.getByText('Modalités d\'annulation')).toBeInTheDocument()
    expect(screen.getByText('Flexible')).toBeInTheDocument()
  })
})
