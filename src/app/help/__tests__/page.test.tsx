import { render, screen } from '@testing-library/react'
import HelpPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('Help Page', () => {
  it('renders help content', () => {
    render(<HelpPage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
