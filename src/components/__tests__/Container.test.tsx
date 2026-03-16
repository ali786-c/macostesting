import { render, screen } from '@testing-library/react'
import Container from '../Container'

describe('Container', () => {
  it('should render children', () => {
    render(<Container>Content</Container>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should apply default maxWidth (7xl)', () => {
    const { container } = render(<Container>Test</Container>)
    expect(container.firstChild).toHaveClass('max-w-7xl')
  })

  it('should apply maxWidth classes', () => {
    const { rerender, container } = render(<Container maxWidth="sm">Test</Container>)
    expect(container.firstChild).toHaveClass('max-w-sm')

    rerender(<Container maxWidth="xl">Test</Container>)
    expect(container.firstChild).toHaveClass('max-w-xl')

    rerender(<Container maxWidth="full">Test</Container>)
    expect(container.firstChild).toHaveClass('max-w-full')
  })

  it('should apply custom className', () => {
    const { container } = render(<Container className="custom">Test</Container>)
    expect(container.firstChild).toHaveClass('custom')
  })

  it('should have mx-auto for centering', () => {
    const { container } = render(<Container>Test</Container>)
    expect(container.firstChild).toHaveClass('mx-auto')
  })
})
