import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmModal from '../ConfirmModal'

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    message: 'Êtes-vous sûr ?',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Êtes-vous sûr ?')).not.toBeInTheDocument()
  })

  it('should render message when isOpen is true', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByText('Êtes-vous sûr ?')).toBeInTheDocument()
  })

  it('should render title when provided', () => {
    render(<ConfirmModal {...defaultProps} title="Confirmation" />)
    expect(screen.getByText('Confirmation')).toBeInTheDocument()
  })

  it('should call onClose when cancel button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Annuler'))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onConfirm and onClose when confirm button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Confirmer'))
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when close button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('should render custom confirm and cancel text', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmText="Oui"
        cancelText="Non"
      />
    )
    expect(screen.getByText('Oui')).toBeInTheDocument()
    expect(screen.getByText('Non')).toBeInTheDocument()
  })

  it('should apply danger variant by default', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(document.querySelector('.bg-red-100')).toBeInTheDocument()
  })

  it('should apply warning variant when specified', () => {
    render(<ConfirmModal {...defaultProps} variant="warning" />)
    expect(document.querySelector('.bg-orange-100')).toBeInTheDocument()
  })

  it('should apply info variant when specified', () => {
    render(<ConfirmModal {...defaultProps} variant="info" />)
    expect(document.querySelector('.bg-blue-100')).toBeInTheDocument()
  })

  it('should call onClose when backdrop is clicked', () => {
    render(<ConfirmModal {...defaultProps} />)
    const backdrop = screen.getByText('Êtes-vous sûr ?').closest('.fixed')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(defaultProps.onClose).toHaveBeenCalled()
    }
  })
})
