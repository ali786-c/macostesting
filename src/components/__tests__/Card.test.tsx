import { render, screen, fireEvent } from '@testing-library/react'
import Card from '../Card'

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should apply default variant', () => {
    const { container } = render(<Card>Test</Card>)
    expect(container.firstChild).toHaveClass('bg-white')
    expect(container.firstChild).toHaveClass('border-gray-200')
  })

  it('should apply glass variant', () => {
    const { container } = render(<Card variant="glass">Test</Card>)
    expect(container.firstChild).toHaveClass('backdrop-blur-sm')
  })

  it('should apply elevated variant', () => {
    const { container } = render(<Card variant="elevated">Test</Card>)
    expect(container.firstChild).toHaveClass('shadow-lg')
  })

  it('should apply outlined variant', () => {
    const { container } = render(<Card variant="outlined">Test</Card>)
    expect(container.firstChild).toHaveClass('border-2')
  })

  it('should apply padding classes', () => {
    const { rerender, container } = render(<Card padding="none">Test</Card>)
    expect(container.firstChild).not.toHaveClass('p-4')

    rerender(<Card padding="sm">Test</Card>)
    expect(container.firstChild).toHaveClass('p-4')

    rerender(<Card padding="lg">Test</Card>)
    expect(container.firstChild).toHaveClass('p-8')
  })

  it('should render as button when onClick is provided', () => {
    const handleClick = jest.fn()
    render(<Card onClick={handleClick}>Clickable</Card>)
    const card = screen.getByText('Clickable')
    expect(card.tagName).toBe('BUTTON')
    fireEvent.click(card)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should render as div when onClick is not provided', () => {
    render(<Card>Static</Card>)
    expect(screen.getByText('Static').tagName).toBe('DIV')
  })

  it('should apply hover classes when hover prop is true', () => {
    const { container } = render(<Card hover>Hoverable</Card>)
    expect(container.firstChild).toHaveClass('hover:shadow-md')
    expect(container.firstChild).toHaveClass('cursor-pointer')
  })

  it('should apply custom className', () => {
    const { container } = render(<Card className="custom-card">Test</Card>)
    expect(container.firstChild).toHaveClass('custom-card')
  })
})
