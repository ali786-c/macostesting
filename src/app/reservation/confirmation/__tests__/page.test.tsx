import { render, screen } from '@testing-library/react'
import ReservationConfirmationPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

jest.mock('@/services/api', () => ({
  placesAPI: { getById: jest.fn().mockResolvedValue({ id: 1, city: 'Paris', type: 'PARKING' }) },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('?placeId=1&startDate=2025-01-01&endDate=2025-01-02'),
}))

describe('Reservation Confirmation Page', () => {
  it('renders confirmation page', async () => {
    render(<ReservationConfirmationPage />)
    await expect(screen.findByRole('main')).resolves.toBeInTheDocument()
  })
})
