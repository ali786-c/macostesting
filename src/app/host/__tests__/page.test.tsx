import { render, screen } from '@testing-library/react'
import HostPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('Host Page', () => {
  it('renders host page', () => {
    render(<HostPage />)
    expect(screen.getByText(/Transformez votre espace en revenus/i)).toBeInTheDocument()
  })
})
