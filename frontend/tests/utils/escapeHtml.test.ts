import { describe, it, expect } from 'vitest'
import { escapeHtml, escapeAttr } from '../../src/utils/escapeHtml'

describe('escapeHtml', () => {
  it('escapes all HTML special characters', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('escapes HTML tags', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    )
  })
})

describe('escapeAttr', () => {
  it('escapes ampersand and double quote', () => {
    expect(escapeAttr('a&b"c')).toBe('a&amp;b&quot;c')
  })

  it('handles null', () => {
    expect(escapeAttr(null)).toBe('')
  })

  it('handles undefined', () => {
    expect(escapeAttr(undefined)).toBe('')
  })
})
