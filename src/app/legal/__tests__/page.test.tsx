import { render, screen } from '@testing-library/react'
import LegalPage from '../page'

describe('Legal Page', () => {
  it('renders legal title', () => {
    render(<LegalPage />)
    expect(screen.getByText('Mentions Légales')).toBeInTheDocument()
  })

  it('renders company info section', () => {
    render(<LegalPage />)
    expect(screen.getByText(/Informations sur l'entreprise/)).toBeInTheDocument()
  })
})
