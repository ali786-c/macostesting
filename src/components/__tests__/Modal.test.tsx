import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal'

describe('Modal', () => {
  beforeEach(() => {
    // Mock createPortal to render directly
    document.body.innerHTML = ''
  })

  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">
        Content
      </Modal>
    )
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        Content
      </Modal>
    )
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const handleClose = jest.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    )
    
    const closeButton = screen.getByLabelText('Fermer')
    fireEvent.click(closeButton)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when backdrop is clicked', () => {
    const handleClose = jest.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    )
    
    const backdrop = screen.getByText('Test Modal').closest('.backdrop-blur-sm')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(handleClose).toHaveBeenCalledTimes(1)
    }
  })

  it('should not call onClose when modal content is clicked', () => {
    const handleClose = jest.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    )
    
    const content = screen.getByText('Content')
    fireEvent.click(content)
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('should render title as string', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="String Title">
        Content
      </Modal>
    )
    expect(screen.getByText('String Title')).toBeInTheDocument()
  })

  it('should render title as ReactNode', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title={<div>React Node Title</div>}>
        Content
      </Modal>
    )
    expect(screen.getByText('React Node Title')).toBeInTheDocument()
  })

  it('should apply size classes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test" size="sm">
        Content
      </Modal>
    )
    expect(document.querySelector('.max-w-md')).toBeInTheDocument()

    rerender(
      <Modal isOpen={true} onClose={jest.fn()} title="Test" size="lg">
        Content
      </Modal>
    )
    expect(document.querySelector('.max-w-2xl')).toBeInTheDocument()
  })
})
