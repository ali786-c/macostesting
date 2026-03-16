import { render, screen } from '@testing-library/react'
import CGVPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('CGV Page', () => {
  it('renders CGV title', () => {
    render(<CGVPage />)
    expect(screen.getByText(/Conditions générales de vente/)).toBeInTheDocument()
  })

  it('renders main content', () => {
    render(<CGVPage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
