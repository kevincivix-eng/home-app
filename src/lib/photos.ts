/**
 * Shrinks a photo from the camera/library before upload: max side `maxSize` px, JPEG.
 * A 12MP iPhone photo (~3–5MB) becomes ~150–300KB.
 */
export async function compressImage(file: Blob, maxSize = 1280, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  const source: CanvasImageSource & { width: number; height: number } = bitmap ?? (await loadImage(file))
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(source.width * scale)
  canvas.height = Math.round(source.height * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  bitmap?.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', quality))
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img) }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(b)
  })
