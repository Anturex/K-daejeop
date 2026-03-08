import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RatingSelector } from '../../src/components/Reviews/RatingSelector'

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

describe('RatingSelector', () => {
  it('renders 4 rating buttons', () => {
    render(<RatingSelector value={null} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
  })

  it('calls onChange when rating clicked', () => {
    const onChange = vi.fn()
    render(<RatingSelector value={null} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2]!)
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('calls onChange with 0 when first button clicked', () => {
    const onChange = vi.fn()
    render(<RatingSelector value={null} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0]!)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('displays star characters and cross mark', () => {
    const { container } = render(
      <RatingSelector value={2} onChange={() => {}} />,
    )
    expect(container.textContent).toContain('\u2715')
    expect(container.textContent).toContain('\u2605')
    expect(container.textContent).toContain('\u2605\u2605')
    expect(container.textContent).toContain('\u2605\u2605\u2605')
  })
})
