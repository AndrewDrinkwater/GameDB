const CARET_STYLE_PROPERTIES = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontFamily',
  'lineHeight',
  'textAlign',
  'textTransform',
  'textIndent',
  'letterSpacing',
  'wordSpacing',
]

const ZERO_WIDTH_SPACE = '\u200b'

export const getTextareaCaretCoordinates = (textarea, position) => {
  if (!textarea || typeof textarea.value !== 'string') {
    return null
  }

  const doc = textarea.ownerDocument || document
  const win = doc.defaultView || window
  const computedStyle = win.getComputedStyle(textarea)
  const selectionPosition =
    typeof position === 'number'
      ? position
      : typeof textarea.selectionEnd === 'number'
        ? textarea.selectionEnd
        : textarea.value.length

  const div = doc.createElement('div')
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'

  CARET_STYLE_PROPERTIES.forEach((property) => {
    div.style[property] = computedStyle[property]
  })

  div.textContent = textarea.value.slice(0, selectionPosition)
  const marker = doc.createElement('span')
  marker.textContent = ZERO_WIDTH_SPACE
  div.appendChild(marker)
  doc.body.appendChild(div)

  const markerRect = marker.getBoundingClientRect()
  const divRect = div.getBoundingClientRect()
  doc.body.removeChild(div)

  const textareaRect = textarea.getBoundingClientRect()
  const relativeLeft = markerRect.left - divRect.left
  const relativeTop = markerRect.top - divRect.top

  const lineHeight =
    parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) || 16

  return {
    left: textareaRect.left + relativeLeft - textarea.scrollLeft,
    top: textareaRect.top + relativeTop - textarea.scrollTop,
    lineHeight,
  }
}

export default getTextareaCaretCoordinates
