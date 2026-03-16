import { render, screen, fireEvent } from '@testing-library/react'
import { SearchProvider, useSearch } from '../SearchContext'

function TestConsumer() {
  const {
    city,
    setCity,
    selectedType,
    setSelectedType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedTypes,
    setSelectedTypes,
    selectedCityCoords,
    setSelectedCityCoords,
  } = useSearch()

  return (
    <div>
      <span data-testid="city">{city}</span>
      <button onClick={() => setCity('Paris')}>Set Paris</button>
      <span data-testid="selectedType">{selectedType}</span>
      <button onClick={() => setSelectedType('parking')}>Set Parking</button>
      <span data-testid="startDate">{startDate ? startDate.toISOString() : 'null'}</span>
      <button onClick={() => setStartDate(new Date('2024-01-01'))}>Set Start</button>
      <span data-testid="endDate">{endDate ? endDate.toISOString() : 'null'}</span>
      <button onClick={() => setEndDate(new Date('2024-01-05'))}>Set End</button>
      <span data-testid="selectedTypes">{selectedTypes.join(',')}</span>
      <button onClick={() => setSelectedTypes(['parking'])}>Set Types</button>
      <span data-testid="coords">
        {selectedCityCoords ? `${selectedCityCoords.lat},${selectedCityCoords.lng}` : 'null'}
      </span>
      <button onClick={() => setSelectedCityCoords({ lat: 48.85, lng: 2.35 })}>
        Set Coords
      </button>
    </div>
  )
}

describe('SearchContext', () => {
  it('should throw when useSearch is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useSearch must be used within a SearchProvider')

    consoleSpy.mockRestore()
  })

  it('should provide default values', () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    )

    expect(screen.getByTestId('city')).toHaveTextContent('')
    expect(screen.getByTestId('selectedType')).toHaveTextContent('all')
    expect(screen.getByTestId('startDate')).toHaveTextContent('null')
    expect(screen.getByTestId('endDate')).toHaveTextContent('null')
    expect(screen.getByTestId('selectedTypes')).toHaveTextContent('')
    expect(screen.getByTestId('coords')).toHaveTextContent('null')
  })

  it('should update city when setCity is called', () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    )

    fireEvent.click(screen.getByText('Set Paris'))
    expect(screen.getByTestId('city')).toHaveTextContent('Paris')
  })

  it('should update selectedType when setSelectedType is called', () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    )

    fireEvent.click(screen.getByText('Set Parking'))
    expect(screen.getByTestId('selectedType')).toHaveTextContent('parking')
  })

  it('should update dates when setStartDate and setEndDate are called', () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    )

    fireEvent.click(screen.getByText('Set Start'))
    expect(screen.getByTestId('startDate')).toHaveTextContent(/2024-01-01/)

    fireEvent.click(screen.getByText('Set End'))
    expect(screen.getByTestId('endDate')).toHaveTextContent(/2024-01-05/)
  })

  it('should update selectedTypes when setSelectedTypes is called', () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    )

    fireEvent.click(screen.getByText('Set Types'))
    expect(screen.getByTestId('selectedTypes')).toHaveTextContent('parking')
  })

  it('should update selectedCityCoords when setSelectedCityCoords is called', () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    )

    fireEvent.click(screen.getByText('Set Coords'))
    expect(screen.getByTestId('coords')).toHaveTextContent('48.85,2.35')
  })
})
