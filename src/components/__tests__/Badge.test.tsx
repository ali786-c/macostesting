import { render, screen, fireEvent } from '@testing-library/react'
import Badge from '../Badge'
import { Star } from 'lucide-react'

describe('Badge', () => {
  it('should render children', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('should apply default variant classes', () => {
    render(<Badge>Default</Badge>)
    expect(document.querySelector('.bg-gray-100')).toBeInTheDocument()
  })

  it('should apply primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>)
    expect(document.querySelector('.bg-orange-100')).toBeInTheDocument()
  })

  it('should apply success variant', () => {
    render(<Badge variant="success">Success</Badge>)
    expect(document.querySelector('.bg-green-100')).toBeInTheDocument()
  })

  it('should apply error variant', () => {
    render(<Badge variant="error">Error</Badge>)
    expect(document.querySelector('.bg-red-100')).toBeInTheDocument()
  })

  it('should apply size classes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>)
    expect(document.querySelector('.text-xs')).toBeInTheDocument()

    rerender(<Badge size="lg">Large</Badge>)
    expect(document.querySelector('.text-base')).toBeInTheDocument()
  })

  it('should render as button when onClick is provided', () => {
    const handleClick = jest.fn()
    render(<Badge onClick={handleClick}>Clickable</Badge>)
    const badge = screen.getByText('Clickable')
    expect(badge.tagName).toBe('BUTTON')
    fireEvent.click(badge)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should render as span when onClick is not provided', () => {
    render(<Badge>Static</Badge>)
    expect(screen.getByText('Static').tagName).toBe('SPAN')
  })

  it('should render icon when provided', () => {
    render(<Badge icon={Star}>With Icon</Badge>)
    expect(document.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('With Icon')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>)
    expect(document.querySelector('.custom-class')).toBeInTheDocument()
  })
})
