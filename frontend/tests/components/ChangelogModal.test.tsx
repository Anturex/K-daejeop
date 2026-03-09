import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChangelogModal } from '../../src/components/ChangelogModal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'changelog.title': '새로운 기능: 뱃지판',
        'changelog.close': '확인',
        'changelog.badgeIntro': '뱃지판이 추가되었습니다!',
        'changelog.badgePersonal': '나 혼자만 만들어서 사용',
        'changelog.badgeShare': '공유코드로 공유',
        'changelog.badgePublish': '배포하기로 공개',
      }
      return map[key] ?? key
    },
  }),
}))

beforeEach(() => {
  localStorage.clear()
})

describe('ChangelogModal', () => {
  it('shows modal when changelog version is unseen', () => {
    render(<ChangelogModal />)
    expect(screen.getByText('새로운 기능: 뱃지판')).toBeInTheDocument()
    expect(screen.getByText('뱃지판이 추가되었습니다!')).toBeInTheDocument()
  })

  it('hides modal when changelog version was already seen', () => {
    localStorage.setItem('k_changelog_seen', '2026-03-10b')
    render(<ChangelogModal />)
    expect(screen.queryByText('새로운 기능: 뱃지판')).not.toBeInTheDocument()
  })

  it('dismisses and saves version on close', () => {
    render(<ChangelogModal />)
    fireEvent.click(screen.getByText('확인'))
    expect(screen.queryByText('새로운 기능: 뱃지판')).not.toBeInTheDocument()
    expect(localStorage.getItem('k_changelog_seen')).toBe('2026-03-10b')
  })

  it('shows all changelog entries', () => {
    render(<ChangelogModal />)
    expect(screen.getByText('뱃지판이 추가되었습니다!')).toBeInTheDocument()
    expect(screen.getByText('나 혼자만 만들어서 사용')).toBeInTheDocument()
    expect(screen.getByText('공유코드로 공유')).toBeInTheDocument()
    expect(screen.getByText('배포하기로 공개')).toBeInTheDocument()
  })
})
