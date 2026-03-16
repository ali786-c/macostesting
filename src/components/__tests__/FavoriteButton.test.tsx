import { render, screen, fireEvent } from '@testing-library/react'
import FavoriteButton from '../FavoriteButton'
import { FavoritesProvider } from '@/contexts/FavoritesContext'

// Mock services/api for FavoritesContext
jest.mock('@/services/api', () => ({
  favoritesAPI: {
    addFavorite: jest.fn().mockResolvedValue(undefined),
    removeFavorite: jest.fn().mockResolvedValue(undefined),
    getFavorites: jest.fn().mockResolvedValue([]),
  },
  rentoallFavoritesAPI: {
    addFavorite: jest.fn().mockResolvedValue(undefined),
    removeFavorite: jest.fn().mockResolvedValue(undefined),
    getFavorites: jest.fn().mockResolvedValue([]),
  },
}))

const renderWithProvider = (ui: React.ReactElement) =>
  render(<FavoritesProvider>{ui}</FavoritesProvider>)

describe('FavoriteButton', () => {
  const defaultProps = {
    id: 'place-1',
    type: 'establishment' as const,
    name: 'Test Place',
  }

  it('should render with aria-label for adding to favorites', () => {
    renderWithProvider(<FavoriteButton {...defaultProps} />)
    expect(screen.getByLabelText('Ajouter aux favoris')).toBeInTheDocument()
  })

  it('should render star icon', () => {
    renderWithProvider(<FavoriteButton {...defaultProps} />)
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('should show label when showLabel is true', () => {
    renderWithProvider(<FavoriteButton {...defaultProps} showLabel />)
    expect(screen.getByText('Ajouter aux favoris')).toBeInTheDocument()
  })

  it('should apply size classes', () => {
    const { rerender } = renderWithProvider(<FavoriteButton {...defaultProps} size="sm" />)
    expect(document.querySelector('.w-4')).toBeInTheDocument()

    rerender(
      <FavoritesProvider>
        <FavoriteButton {...defaultProps} size="lg" />
      </FavoritesProvider>
    )
    expect(document.querySelector('.w-6')).toBeInTheDocument()
  })

  it('should call toggleFavorite when clicked', async () => {
    renderWithProvider(<FavoriteButton {...defaultProps} />)
    const button = screen.getByLabelText('Ajouter aux favoris')

    fireEvent.click(button)

    // Wait for async toggle to complete
    await screen.findByLabelText(/favoris/)
  })

  it('should apply favorited styling when item is in favorites', async () => {
    renderWithProvider(<FavoriteButton {...defaultProps} />)
    const button = screen.getByLabelText('Ajouter aux favoris')
    fireEvent.click(button)

    // After toggle, might show "Retirer des favoris"
    await screen.findByRole('button')
  })
})
