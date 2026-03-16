import { render, screen } from '@testing-library/react'
import StarRating from '../StarRating'

describe('StarRating', () => {
  it('should render rating value', () => {
    render(<StarRating rating={4.5} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('should render 5 stars by default', () => {
    render(<StarRating rating={3} />)
    const stars = document.querySelectorAll('svg')
    expect(stars.length).toBe(5)
  })

  it('should render custom maxRating', () => {
    render(<StarRating rating={7} maxRating={10} />)
    const stars = document.querySelectorAll('svg')
    expect(stars.length).toBe(10)
  })

  it('should not show value when showValue is false', () => {
    render(<StarRating rating={4} showValue={false} />)
    expect(screen.queryByText('4.0')).not.toBeInTheDocument()
  })

  it('should show reviews count when showReviews is true', () => {
    render(<StarRating rating={4} showReviews reviewsCount={12} />)
    expect(screen.getByText('(12)')).toBeInTheDocument()
  })

  it('should not show reviews when reviewsCount is undefined', () => {
    render(<StarRating rating={4} showReviews />)
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
  })

  it('should apply size classes', () => {
    const { rerender } = render(<StarRating rating={4} size="sm" />)
    expect(document.querySelector('.w-3')).toBeInTheDocument()

    rerender(<StarRating rating={4} size="lg" />)
    expect(document.querySelector('.w-5')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<StarRating rating={4} className="custom-rating" />)
    expect(document.querySelector('.custom-rating')).toBeInTheDocument()
  })
})
