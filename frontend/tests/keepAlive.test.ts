import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startKeepAlive } from '../src/keepAlive'

describe('startKeepAlive', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('polls /api/health every 5 seconds', () => {
    const id = startKeepAlive()

    expect(fetchSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5000)
    expect(fetchSpy).toHaveBeenCalledWith('/api/health')
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(5000)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    clearInterval(id)
  })

  it('uses custom interval when provided', () => {
    const id = startKeepAlive(3000)

    vi.advanceTimersByTime(3000)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(3000)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    clearInterval(id)
  })

  it('silently ignores fetch errors', () => {
    fetchSpy.mockRejectedValue(new Error('network error'))

    const id = startKeepAlive()

    // Should not throw
    vi.advanceTimersByTime(5000)
    expect(fetchSpy).toHaveBeenCalledWith('/api/health')

    clearInterval(id)
  })
})
