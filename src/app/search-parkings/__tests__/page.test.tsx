import { render, screen } from '@testing-library/react'
import SearchParkingsPage from '../page'
import { SearchProvider } from '@/contexts/SearchContext'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)
jest.mock('@/components/sections/AdvancedFilters', () => () => <div data-testid="advanced-filters" />)
jest.mock('@/components/sections/featured-spaces-section', () => () => <div data-testid="featured" />)

jest.mock('@/components/map/PropertiesMapMapLibre', () => ({
  __esModule: true,
  default: () => <div data-testid="map" />,
}))

jest.mock('@/services/api', () => ({
  placesAPI: {
    search: jest.fn().mockResolvedValue([]),
    getAll: jest.fn().mockResolvedValue([]),
    getAvailableFilters: jest.fn().mockResolvedValue({}),
    getById: jest.fn().mockResolvedValue({}),
  },
  locationsAPI: { searchCities: jest.fn().mockResolvedValue([]), search: jest.fn().mockResolvedValue([]) },
  rentoallFavoritesAPI: { getFavorites: jest.fn().mockResolvedValue([]), isFavorite: jest.fn().mockResolvedValue(false) },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/search-parkings',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Search Parkings Page', () => {
  it.skip('renders search page (complex - many API calls)', async () => {
    render(
      <SearchProvider>
        <SearchParkingsPage />
      </SearchProvider>
    )
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
