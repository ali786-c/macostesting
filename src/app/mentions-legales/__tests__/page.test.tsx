import { render, screen } from '@testing-library/react'
import MentionsLegalesPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('Mentions Légales Page', () => {
  it('renders mentions légales title', () => {
    render(<MentionsLegalesPage />)
    expect(screen.getByText(/Mentions légales/)).toBeInTheDocument()
  })
})
