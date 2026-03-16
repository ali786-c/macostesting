import { render, screen } from '@testing-library/react'
import PaymentCancelPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('Payment Cancel Page', () => {
  it('renders cancel message', () => {
    render(<PaymentCancelPage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
