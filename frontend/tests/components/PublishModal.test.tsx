import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PublishModal } from '../../src/components/Badges/PublishModal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'badge.publishTitle': '뱃지판 배포',
        'badge.publishDescHint': '다른 유저에게 보여질 설명을 추가하세요',
        'badge.publishDescPlaceholder': '뱃지판에 대한 간단한 설명...',
        'badge.publish': '배포하기',
        'review.cancel': '취소',
      }
      return map[key] ?? key
    },
  }),
}))

describe('PublishModal', () => {
  const mockConfirm = vi.fn()
  const mockCancel = vi.fn()

  it('renders modal title', () => {
    render(
      <PublishModal currentDescription="" onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    expect(screen.getByText('뱃지판 배포')).toBeInTheDocument()
  })

  it('renders hint text', () => {
    render(
      <PublishModal currentDescription="" onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    expect(screen.getByText('다른 유저에게 보여질 설명을 추가하세요')).toBeInTheDocument()
  })

  it('pre-fills textarea with current description', () => {
    render(
      <PublishModal currentDescription="기존 설명" onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    const textarea = screen.getByPlaceholderText('뱃지판에 대한 간단한 설명...')
    expect(textarea).toHaveValue('기존 설명')
  })

  it('shows character count', () => {
    render(
      <PublishModal currentDescription="hello" onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    expect(screen.getByText((_, el) => el?.textContent === '5/120')).toBeInTheDocument()
  })

  it('updates character count on typing', () => {
    render(
      <PublishModal currentDescription="" onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    const textarea = screen.getByPlaceholderText('뱃지판에 대한 간단한 설명...')
    fireEvent.change(textarea, { target: { value: 'test' } })
    expect(screen.getByText((_, el) => el?.textContent === '4/120')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button clicked', () => {
    render(
      <PublishModal currentDescription="" onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    fireEvent.click(screen.getByText('취소'))
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm with trimmed description when confirm clicked', () => {
    render(
      <PublishModal currentDescription="  좋은 설명  " onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    fireEvent.click(screen.getByText('배포하기'))
    expect(mockConfirm).toHaveBeenCalledWith('좋은 설명')
  })

  it('calls onCancel when backdrop clicked', () => {
    render(
      <PublishModal currentDescription="" onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    // The backdrop is the outer fixed div
    const backdrop = screen.getByText('뱃지판 배포').closest('.fixed')!
    fireEvent.click(backdrop)
    expect(mockCancel).toHaveBeenCalled()
  })

  it('renders publish and cancel buttons', () => {
    render(
      <PublishModal currentDescription="" onConfirm={mockConfirm} onCancel={mockCancel} />,
    )
    expect(screen.getByText('배포하기')).toBeInTheDocument()
    expect(screen.getByText('취소')).toBeInTheDocument()
  })
})
