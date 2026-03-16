import { render, screen, fireEvent } from '@testing-library/react'
import Pagination from '../Pagination'

describe('Pagination', () => {
  it('should return null when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should return null when totalPages is 0', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} onPageChange={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render Précédent and Suivant buttons', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
    )
    expect(screen.getByText('Précédent')).toBeInTheDocument()
    expect(screen.getByText('Suivant')).toBeInTheDocument()
  })

  it('should render page numbers', () => {
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={jest.fn()} />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should call onPageChange when page is clicked', () => {
    const handlePageChange = jest.fn()
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={handlePageChange} />
    )
    fireEvent.click(screen.getByText('2'))
    expect(handlePageChange).toHaveBeenCalledWith(2)
  })

  it('should call onPageChange when Précédent is clicked', () => {
    const handlePageChange = jest.fn()
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={handlePageChange} />
    )
    fireEvent.click(screen.getByText('Précédent'))
    expect(handlePageChange).toHaveBeenCalledWith(1)
  })

  it('should call onPageChange when Suivant is clicked', () => {
    const handlePageChange = jest.fn()
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={handlePageChange} />
    )
    fireEvent.click(screen.getByText('Suivant'))
    expect(handlePageChange).toHaveBeenCalledWith(3)
  })

  it('should disable Précédent on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
    )
    const prevButton = screen.getByText('Précédent').closest('button')
    expect(prevButton).toBeDisabled()
  })

  it('should disable Suivant on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={jest.fn()} />
    )
    const nextButton = screen.getByText('Suivant').closest('button')
    expect(nextButton).toBeDisabled()
  })

  it('should not show labels when showLabels is false', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={jest.fn()}
        showLabels={false}
      />
    )
    expect(screen.queryByText('Précédent')).not.toBeInTheDocument()
    expect(screen.queryByText('Suivant')).not.toBeInTheDocument()
  })
})
