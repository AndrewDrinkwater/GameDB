export const cropImageFile = async (file, cropState, options = {}) => {
  if (!file || !cropState) return file
  const { offset, scale, containerSize, naturalWidth, naturalHeight } = cropState
  if (!offset || !scale || !containerSize || !naturalWidth || !naturalHeight) {
    return file
  }

  if (typeof createImageBitmap !== 'function') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const widthRatio = naturalWidth ? bitmap.width / naturalWidth : 1
    const heightRatio = naturalHeight ? bitmap.height / naturalHeight : 1
    const ratio = (widthRatio + heightRatio) / 2 || 1

    const effectiveScale = scale * ratio
    const cropWidth = containerSize / effectiveScale
    const cropHeight = containerSize / effectiveScale
    const cropX = ((0 - offset.x) / scale) * ratio
    const cropY = ((0 - offset.y) / scale) * ratio

    const safeCropWidth = Math.min(Math.max(cropWidth, 1), bitmap.width)
    const safeCropHeight = Math.min(Math.max(cropHeight, 1), bitmap.height)
    const maxX = bitmap.width - safeCropWidth
    const maxY = bitmap.height - safeCropHeight
    const safeCropX = Math.min(Math.max(cropX, 0), Math.max(maxX, 0))
    const safeCropY = Math.min(Math.max(cropY, 0), Math.max(maxY, 0))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(safeCropWidth)
    canvas.height = Math.round(safeCropHeight)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      bitmap,
      safeCropX,
      safeCropY,
      safeCropWidth,
      safeCropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    bitmap.close?.()

    const mimeType = options.mimeType || file.type || 'image/jpeg'
    const quality = options.quality || (mimeType === 'image/png' ? undefined : 0.92)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Unable to crop image'))
          }
        },
        mimeType,
        quality,
      )
    })

    const croppedFileName = (() => {
      if (!file.name) return 'cropped-image'
      const ext = mimeType === 'image/png' ? '.png' : '.jpg'
      if (file.name.toLowerCase().endsWith(ext)) return file.name
      const base = file.name.includes('.')
        ? file.name.slice(0, file.name.lastIndexOf('.'))
        : file.name
      return `${base}${ext}`
    })()

    return new File([blob], croppedFileName, { type: mimeType })
  } catch (err) {
    console.warn('⚠️ Unable to crop image, using original selection', err)
    return file
  }
}
