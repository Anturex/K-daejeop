import { describe, it, expect } from 'vitest'
import { getThumbUrl } from '../../src/utils/imageUrl'

describe('getThumbUrl', () => {
  it('inserts _thumb before the file extension', () => {
    expect(getThumbUrl('https://example.supabase.co/storage/v1/object/public/review-photos/uid/123.jpg'))
      .toBe('https://example.supabase.co/storage/v1/object/public/review-photos/uid/123_thumb.jpg')
  })

  it('handles .png extension', () => {
    expect(getThumbUrl('https://cdn.example.com/photo.png'))
      .toBe('https://cdn.example.com/photo_thumb.png')
  })

  it('returns empty string for null', () => {
    expect(getThumbUrl(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(getThumbUrl(undefined)).toBe('')
  })

  it('returns original URL if filename has no extension', () => {
    expect(getThumbUrl('https://example.com/photo')).toBe('https://example.com/photo')
  })

  it('handles URL with multiple dots', () => {
    expect(getThumbUrl('https://abc.supabase.co/storage/v1/obj/photos/user.name/1700000.jpg'))
      .toBe('https://abc.supabase.co/storage/v1/obj/photos/user.name/1700000_thumb.jpg')
  })
})
