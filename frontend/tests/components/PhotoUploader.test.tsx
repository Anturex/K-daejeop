import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { compressWithThumb } from '../../src/components/Reviews/PhotoUploader'

// Mock Canvas API
function createMockCanvas() {
  const ctx = { drawImage: vi.fn() }
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn(
      (cb: (blob: Blob | null) => void, type: string, _quality: number) => {
        cb(new Blob(['fake-image'], { type }))
      },
    ),
  }
}

let OriginalImage: typeof Image

beforeEach(() => {
  // Mock document.createElement for canvas
  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') return createMockCanvas() as unknown as HTMLCanvasElement
    return originalCreateElement(tag)
  })

  // Replace global Image constructor
  OriginalImage = globalThis.Image
  globalThis.Image = class MockImage {
    width = 4000
    height = 3000
    src = ''
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor() {
      setTimeout(() => this.onload?.(), 0)
    }
  } as unknown as typeof Image

  // Mock URL.createObjectURL / revokeObjectURL
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
  globalThis.Image = OriginalImage
  vi.restoreAllMocks()
})

describe('compressWithThumb', () => {
  it('returns two files: main and thumbnail', async () => {
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
    const [main, thumb] = await compressWithThumb(file)

    expect(main).toBeInstanceOf(File)
    expect(thumb).toBeInstanceOf(File)
    expect(main.name).toBe('photo.jpg')
    expect(thumb.name).toBe('photo_thumb.jpg')
    expect(main.type).toBe('image/jpeg')
    expect(thumb.type).toBe('image/jpeg')
  })

  it('strips original extension and uses .jpg', async () => {
    const file = new File(['test'], 'image.png', { type: 'image/png' })
    const [main, thumb] = await compressWithThumb(file)

    expect(main.name).toBe('image.jpg')
    expect(thumb.name).toBe('image_thumb.jpg')
  })
})
