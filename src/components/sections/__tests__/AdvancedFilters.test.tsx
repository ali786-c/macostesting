import { render, screen, fireEvent } from '@testing-library/react'
import AdvancedFilters from '../AdvancedFilters'
import { LanguageProvider } from '@/contexts/LanguageContext'

const defaultProps = {
  selectedTypes: [],
  onTypesChange: jest.fn(),
  priceRange: [0, 500] as [number, number],
  onPriceRangeChange: jest.fn(),
  priceUnit: 'day' as const,
  onPriceUnitChange: jest.fn(),
  instantBooking: null as boolean | null,
  onInstantBookingChange: jest.fn(),
  freeCancellation: null as boolean | null,
  onFreeCancellationChange: jest.fn(),
  noDeposit: null as boolean | null,
  onNoDepositChange: jest.fn(),
  onClose: jest.fn(),
  onApplyFilters: jest.fn(),
  filteredListingsCount: 0,
}

const renderWithProvider = (ui: React.ReactElement) =>
  render(<LanguageProvider>{ui}</LanguageProvider>)

describe('AdvancedFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render Filtres title', () => {
    renderWithProvider(<AdvancedFilters {...defaultProps} embedInContainer />)
    expect(screen.getByText('Filtres')).toBeInTheDocument()
  })

  it('should render type selection buttons', () => {
    renderWithProvider(<AdvancedFilters {...defaultProps} embedInContainer />)
    expect(screen.getByText('Parking')).toBeInTheDocument()
    expect(screen.getByText('Stockage')).toBeInTheDocument()
    expect(screen.getByText('Cave et Divers')).toBeInTheDocument()
  })

  it('should call onTypesChange when type is clicked', () => {
    renderWithProvider(<AdvancedFilters {...defaultProps} embedInContainer />)
    fireEvent.click(screen.getByText('Parking'))
    expect(defaultProps.onTypesChange).toHaveBeenCalled()
  })

  it('should call onClose when close button is clicked', () => {
    renderWithProvider(<AdvancedFilters {...defaultProps} embedInContainer />)
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('should render Afficher les espaces button when embedInContainer', () => {
    renderWithProvider(<AdvancedFilters {...defaultProps} embedInContainer />)
    expect(screen.getByText('Afficher les espaces')).toBeInTheDocument()
  })

  it('should call onApplyFilters when Afficher is clicked', () => {
    renderWithProvider(<AdvancedFilters {...defaultProps} embedInContainer />)
    fireEvent.click(screen.getByText('Afficher les espaces'))
    expect(defaultProps.onApplyFilters).toHaveBeenCalled()
  })

  it('should show selected type as selected', () => {
    renderWithProvider(
      <AdvancedFilters
        {...defaultProps}
        selectedTypes={['parking']}
        embedInContainer
      />
    )
    const parkingBtn = screen.getByText('Parking').closest('button')
    expect(parkingBtn).toHaveClass('border-emerald-500')
  })
})
