import { render, screen } from '@testing-library/react'
import CGUPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('CGU Page', () => {
  it('renders CGU title', () => {
    render(<CGUPage />)
    expect(screen.getByText("Conditions générales d'utilisation")).toBeInTheDocument()
  })

  it('renders main sections', () => {
    render(<CGUPage />)
    expect(screen.getByText(/Objet et champ d'application/)).toBeInTheDocument()
    expect(screen.getByText(/Compte utilisateur/)).toBeInTheDocument()
  })

  it('contains Rentoall platform reference', () => {
    render(<CGUPage />)
    expect(screen.getAllByText(/www.rentoall.fr/).length).toBeGreaterThan(0)
  })
})
