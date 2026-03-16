import { render, screen, fireEvent } from '@testing-library/react'
import FAQPage from '../page'

jest.mock('@/components/sections/header-navigation', () => () => <header data-testid="header" />)
jest.mock('@/components/sections/footer-navigation', () => () => <footer data-testid="footer" />)

describe('FAQ Page', () => {
  it('renders FAQ title and search', () => {
    render(<FAQPage />)
    expect(screen.getByPlaceholderText(/rechercher dans les faq/i)).toBeInTheDocument()
  })

  it('renders at least one FAQ question', () => {
    render(<FAQPage />)
    expect(screen.getByText(/Comment créer un compte Rentoall/)).toBeInTheDocument()
  })

  it('toggles question on click', () => {
    render(<FAQPage />)
    const question = screen.getByText(/Comment créer un compte Rentoall/)
    fireEvent.click(question)
    expect(screen.getByText(/Cliquez sur "S'inscrire"/)).toBeInTheDocument()
  })

  it('filters questions by search', () => {
    render(<FAQPage />)
    const searchInput = screen.getByPlaceholderText(/rechercher dans les faq/i)
    fireEvent.change(searchInput, { target: { value: 'compte' } })
    expect(screen.getByText(/Comment créer un compte Rentoall/)).toBeInTheDocument()
  })
})
