import { render, screen } from '@testing-library/react'
import PaymentSuccessPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(), // Pas d'orderId → affiche "failed" rapidement
}))

describe('Payment Success Page', () => {
  it('renders payment page content', async () => {
    render(<PaymentSuccessPage />)
    await expect(screen.findByText(/paiement|payment/i)).resolves.toBeInTheDocument()
  })
})
