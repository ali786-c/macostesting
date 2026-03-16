import { render, screen, fireEvent } from '@testing-library/react'
import EmptyState from '../EmptyState'
import { Search } from 'lucide-react'

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState icon={Search} title="No results" />)
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('should render description when provided', () => {
    render(
      <EmptyState
        icon={Search}
        title="No results"
        description="Try a different search"
      />
    )
    expect(screen.getByText('Try a different search')).toBeInTheDocument()
  })

  it('should not render description when not provided', () => {
    render(<EmptyState icon={Search} title="No results" />)
    expect(screen.queryByText(/Try a different/)).not.toBeInTheDocument()
  })

  it('should render action button when provided', () => {
    const handleAction = jest.fn()
    render(
      <EmptyState
        icon={Search}
        title="No results"
        action={{ label: 'Retry', onClick: handleAction }}
      />
    )
    const button = screen.getByText('Retry')
    expect(button).toBeInTheDocument()
    
    fireEvent.click(button)
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('should render icon', () => {
    render(<EmptyState icon={Search} title="No results" />)
    const icon = screen.getByText('No results').closest('div')?.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('should apply icon size classes', () => {
    const { rerender } = render(
      <EmptyState icon={Search} title="Test" iconSize="sm" />
    )
    expect(document.querySelector('.w-8')).toBeInTheDocument()

    rerender(<EmptyState icon={Search} title="Test" iconSize="lg" />)
    expect(document.querySelector('.w-16')).toBeInTheDocument()
  })

  it('should apply custom icon color', () => {
    render(
      <EmptyState icon={Search} title="Test" iconColor="text-blue-500" />
    )
    expect(document.querySelector('.text-blue-500')).toBeInTheDocument()
  })
})
