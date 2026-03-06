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
  it('renders 3 rating buttons', () => {
    render(<RatingSelector value={0} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
  })

  it('calls onChange when rating clicked', () => {
    const onChange = vi.fn()
    render(<RatingSelector value={0} onChange={onChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1]!)
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('displays star characters', () => {
    const { container } = render(
      <RatingSelector value={2} onChange={() => {}} />,
    )
    expect(container.textContent).toContain('\u2605')
    expect(container.textContent).toContain('\u2605\u2605')
    expect(container.textContent).toContain('\u2605\u2605\u2605')
  })
})
