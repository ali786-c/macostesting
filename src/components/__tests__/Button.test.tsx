import { render, screen, fireEvent } from '@testing-library/react'
import Button from '../Button'
import { Search } from 'lucide-react'

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled')).toBeDisabled()
  })

  it('should be disabled when loading', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByText('Loading')).toBeDisabled()
  })

  it('should show loading spinner when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should apply primary variant by default', () => {
    render(<Button>Primary</Button>)
    expect(document.querySelector('.bg-orange-600')).toBeInTheDocument()
  })

  it('should apply danger variant', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(document.querySelector('.bg-red-600')).toBeInTheDocument()
  })

  it('should apply outline variant', () => {
    render(<Button variant="outline">Outline</Button>)
    expect(document.querySelector('.border-orange-600')).toBeInTheDocument()
  })

  it('should apply size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(document.querySelector('.text-sm')).toBeInTheDocument()

    rerender(<Button size="lg">Large</Button>)
    expect(document.querySelector('.text-base')).toBeInTheDocument()
  })

  it('should apply fullWidth class', () => {
    render(<Button fullWidth>Full</Button>)
    expect(document.querySelector('.w-full')).toBeInTheDocument()
  })

  it('should render icon on left by default', () => {
    render(<Button icon={Search}>Search</Button>)
    expect(document.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('should render icon on right when iconPosition is right', () => {
    render(<Button icon={Search} iconPosition="right">Search</Button>)
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('should have type button by default', () => {
    render(<Button>Submit</Button>)
    expect(screen.getByText('Submit')).toHaveAttribute('type', 'button')
  })

  it('should have type submit when specified', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByText('Submit')).toHaveAttribute('type', 'submit')
  })

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(document.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('should have title attribute when provided', () => {
    render(<Button title="Tooltip">Hover</Button>)
    expect(screen.getByText('Hover')).toHaveAttribute('title', 'Tooltip')
  })
})
