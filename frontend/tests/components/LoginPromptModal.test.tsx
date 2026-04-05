import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginPromptModal } from '../../src/components/LoginPromptModal'

const mockHandleGoogleLogin = vi.fn()
const mockSetShowLoginPrompt = vi.fn()

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    handleGoogleLogin: mockHandleGoogleLogin,
    isLoggingIn: false,
  }),
}))

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setShowLoginPrompt: mockSetShowLoginPrompt }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'loginPrompt.title': '로그인하고 시작해보세요',
        'loginPrompt.desc': '리뷰 작성, 장소 저장',
        'login.google': 'Google로 로그인',
        'loginPrompt.later': '나중에',
      }
      return map[key] ?? key
    },
  }),
}))

describe('LoginPromptModal', () => {
  it('renders title and description', () => {
    render(<LoginPromptModal />)
    expect(screen.getByText('로그인하고 시작해보세요')).toBeInTheDocument()
    expect(screen.getByText('리뷰 작성, 장소 저장')).toBeInTheDocument()
  })

  it('calls handleGoogleLogin on login button click', () => {
    render(<LoginPromptModal />)
    fireEvent.click(screen.getByText('Google로 로그인'))
    expect(mockSetShowLoginPrompt).toHaveBeenCalledWith(false)
    expect(mockHandleGoogleLogin).toHaveBeenCalled()
  })

  it('closes on dismiss button', () => {
    render(<LoginPromptModal />)
    fireEvent.click(screen.getByText('나중에'))
    expect(mockSetShowLoginPrompt).toHaveBeenCalledWith(false)
  })
})
