import { render, screen } from '@testing-library/react'
import FooterNavigation from '../footer-navigation'

describe('FooterNavigation', () => {
  it('renders copyright', () => {
    render(<FooterNavigation />)
    expect(screen.getByText(/©.*Rentoall/)).toBeInTheDocument()
  })

  it('has links to CGU, CGV, mentions légales', () => {
    render(<FooterNavigation />)
    expect(screen.getByRole('link', { name: 'CGU' })).toHaveAttribute('href', '/cgu')
    expect(screen.getByRole('link', { name: 'CGV' })).toHaveAttribute('href', '/cgv')
    expect(screen.getByRole('link', { name: 'Mentions légales' })).toHaveAttribute('href', '/mentions-legales')
  })

  it('has social links', () => {
    render(<FooterNavigation />)
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument()
  })
})
