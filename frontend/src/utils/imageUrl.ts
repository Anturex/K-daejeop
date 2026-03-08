/**
 * Derive a thumbnail URL from a photo URL by inserting `_thumb` before the extension.
 * For images uploaded after the compression feature, a small thumbnail exists at this path.
 * For older images without thumbnails, callers should use `onerror` to fall back to the original.
 *
 * Example: `.../abc123.jpg` → `.../abc123_thumb.jpg`
 */
export function getThumbUrl(photoUrl: string | null | undefined): string {
  if (!photoUrl) return ''
  // Only consider the filename portion (after last `/`)
  const slashIdx = photoUrl.lastIndexOf('/')
  const filename = slashIdx === -1 ? photoUrl : photoUrl.slice(slashIdx)
  const dotIdx = filename.lastIndexOf('.')
  if (dotIdx === -1) return photoUrl
  const insertAt = slashIdx === -1 ? dotIdx : slashIdx + dotIdx
  return `${photoUrl.slice(0, insertAt)}_thumb${photoUrl.slice(insertAt)}`
}
