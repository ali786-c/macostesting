import { render, screen } from '@testing-library/react'
import FeaturedSpacesSection from '../featured-spaces-section'

jest.mock('@/services/api', () => ({
  rentoallFavoritesAPI: {
    addFavorite: jest.fn().mockResolvedValue({}),
    removeFavorite: jest.fn().mockResolvedValue({}),
    isFavorite: jest.fn().mockResolvedValue(false),
    getFavorites: jest.fn().mockResolvedValue([]),
  },
}))

const mockListings = [
  {
    id: 1,
    address: '123 Rue Test',
    city: 'Paris',
    type: 'PARKING',
    pricePerDay: 15,
    photos: [],
  },
] as any

describe('FeaturedSpacesSection', () => {
  it('renders section with title', () => {
    render(
      <FeaturedSpacesSection
        title="Espaces populaires"
        subtitle="Découvrez nos meilleures offres"
        listings={mockListings}
      />
    )
    expect(screen.getByText('Espaces populaires')).toBeInTheDocument()
  })

  it('returns null when no listings', () => {
    const { container } = render(
      <FeaturedSpacesSection
        title="Test"
        listings={[]}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
