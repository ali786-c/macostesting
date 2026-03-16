import { render, screen } from '@testing-library/react'
import NotFound from '../not-found'

jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

describe('NotFound Page', () => {
  it('renders 404 message', () => {
    render(<NotFound />)
    expect(screen.getByText('Page introuvable')).toBeInTheDocument()
    expect(screen.getByText(/La page que vous recherchez/)).toBeInTheDocument()
  })

  it('has link to home', () => {
    render(<NotFound />)
    const link = screen.getByRole('link', { name: /retour à l'accueil/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })

  it('has accessible home link', () => {
    render(<NotFound />)
    const link = screen.getByRole('link', { name: /retour à l'accueil/i })
    expect(link).toHaveAttribute('href', '/')
  })
})
