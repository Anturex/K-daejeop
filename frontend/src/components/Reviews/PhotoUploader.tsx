import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PhotoUploaderProps {
  file: File | null
  previewUrl: string | null
  onFileSelect: (file: File, previewUrl: string, thumbFile?: File) => void
  onError: (message: string) => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const MAIN_MAX_DIM = 1200
const MAIN_QUALITY = 0.8
const THUMB_MAX_DIM = 200
const THUMB_QUALITY = 0.65

/** Resize an image file via Canvas, returning a compressed JPEG Blob. */
function resizeImage(
  file: File,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        quality,
      )
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Image load failed'))
    }
    img.src = URL.createObjectURL(file)
  })
}

/** Compress image and generate thumbnail. Returns [mainFile, thumbFile]. */
export async function compressWithThumb(
  file: File,
): Promise<[File, File]> {
  const baseName = file.name.replace(/\.[^.]+$/, '')
  const [mainBlob, thumbBlob] = await Promise.all([
    resizeImage(file, MAIN_MAX_DIM, MAIN_QUALITY),
    resizeImage(file, THUMB_MAX_DIM, THUMB_QUALITY),
  ])
  const mainFile = new File([mainBlob], `${baseName}.jpg`, { type: 'image/jpeg' })
  const thumbFile = new File([thumbBlob], `${baseName}_thumb.jpg`, { type: 'image/jpeg' })
  return [mainFile, thumbFile]
}

/**
 * Detect HEIC/HEIF files.
 * iOS sometimes reports JPEG MIME for .heic files, so also check the extension.
 */
function isHeicFile(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true
  if (file.type.startsWith('image/')) return false // real image MIME → not HEIC
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'heic' || ext === 'heif'
}

/** Dynamically load heic2any from CDN on first use */
async function loadHeic2any(): Promise<
  (opts: { blob: Blob; toType: string; quality: number }) => Promise<Blob>
> {
  if ((window as unknown as Record<string, unknown>).heic2any) {
    return (window as unknown as Record<string, unknown>).heic2any as (opts: {
      blob: Blob
      toType: string
      quality: number
    }) => Promise<Blob>
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src =
      'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'
    script.onload = () => {
      const fn = (window as unknown as Record<string, unknown>).heic2any
      if (fn) {
        resolve(
          fn as (opts: {
            blob: Blob
            toType: string
            quality: number
          }) => Promise<Blob>,
        )
      } else {
        reject(new Error('heic2any loaded but not found on window'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load heic2any'))
    document.head.appendChild(script)
  })
}

export function PhotoUploader({
  file: _file,
  previewUrl,
  onFileSelect,
  onError,
}: PhotoUploaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

  const processFile = useCallback(
    async (file: File) => {
      // HEIC conversion
      if (isHeicFile(file)) {
        if (file.size > MAX_FILE_SIZE) {
          onError(t('review.err.fileSize'))
          return
        }

        setIsConverting(true)
        try {
          const heic2any = await loadHeic2any()
          const result = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.85,
          })
          const blob = Array.isArray(result) ? result[0] : result
          const converted = new File(
            [blob],
            file.name.replace(/\.(heic|heif)$/i, '.jpg'),
            { type: 'image/jpeg' },
          )
          setIsConverting(false)
          // Re-process as a normal image
          processFile(converted)
        } catch (err) {
          console.error('[PhotoUploader] heic2any conversion failed:', err)
          setIsConverting(false)
          onError(t('review.err.heicFail'))
        }
        return
      }

      if (!file.type.startsWith('image/')) {
        onError(t('review.err.imageOnly'))
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        onError(t('review.err.fileSize'))
        return
      }

      // Compress + generate thumbnail, then read as data URL for preview
      try {
        const [mainFile, thumbFile] = await compressWithThumb(file)
        const reader = new FileReader()
        reader.onload = (ev) => {
          const url = ev.target?.result as string
          onFileSelect(mainFile, url, thumbFile)
        }
        reader.readAsDataURL(mainFile)
      } catch {
        // Fallback: use original if compression fails
        const reader = new FileReader()
        reader.onload = (ev) => {
          const url = ev.target?.result as string
          onFileSelect(file, url)
        }
        reader.readAsDataURL(file)
      }
    },
    [onFileSelect, onError, t],
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset input so re-selecting the same file triggers change
      e.target.value = ''
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
        isDragOver
          ? 'border-accent bg-accent/5'
          : previewUrl
            ? 'border-border bg-surface'
            : 'border-border bg-bg hover:border-accent-light'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={handleInputChange}
      />

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          className="h-full max-h-[240px] w-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
          <svg
            className="mb-1 h-8 w-8 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium text-text-primary">
            {isConverting
              ? t('review.heicConverting')
              : t('review.photoPrompt')}
          </span>
          <span className="text-xs text-text-muted">
            {t('review.photoHint')}
          </span>
        </div>
      )}
    </div>
  )
}
