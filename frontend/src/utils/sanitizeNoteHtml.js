const allowedTags = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'u',
  'ul',
])

const allowedAttributes = new Set(['class', 'id', 'href', 'rel', 'style', 'target', 'title'])
const allowedProtocols = ['http:', 'https:', 'mailto:']
const allowedStyleProps = new Set([
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-decoration',
  'text-transform',
])

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const isSafeStyleValue = (value) => {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return !/(expression|javascript:|url\s*\()/i.test(trimmed)
}

const sanitiseStyleAttribute = (styleValue) => {
  if (!styleValue) return ''
  const safeDeclarations = []
  const declarations = styleValue.split(';')
  declarations.forEach((declaration) => {
    if (!declaration) return
    const [property, value] = declaration.split(':')
    if (!property || !value) return
    const name = property.trim().toLowerCase()
    if (!allowedStyleProps.has(name)) return
    const cleanedValue = value.trim()
    if (!cleanedValue || !isSafeStyleValue(cleanedValue)) return
    safeDeclarations.push(`${name}: ${cleanedValue}`)
  })
  return safeDeclarations.join('; ')
}

const sanitizeNode = (node) => {
  if (!node) return
  const ELEMENT_NODE = 1
  const COMMENT_NODE = 8

  if (node.nodeType === COMMENT_NODE) {
    node.remove()
    return
  }

  if (node.nodeType !== ELEMENT_NODE) {
    Array.from(node.childNodes || []).forEach(sanitizeNode)
    return
  }

  const tagName = node.tagName ? node.tagName.toLowerCase() : ''
  if (!allowedTags.has(tagName)) {
    const parent = node.parentNode
    if (!parent) {
      node.remove()
      return
    }
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node)
    }
    parent.removeChild(node)
    return
  }

  Array.from(node.attributes || []).forEach((attribute) => {
    const name = attribute.name.toLowerCase()
    if (name.startsWith('on')) {
      node.removeAttribute(attribute.name)
      return
    }

    if (name === 'style') {
      const safeStyles = sanitiseStyleAttribute(attribute.value)
      if (safeStyles) {
        node.setAttribute('style', safeStyles)
      } else {
        node.removeAttribute(attribute.name)
      }
      return
    }

    if (!allowedAttributes.has(name) && !name.startsWith('data-')) {
      node.removeAttribute(attribute.name)
      return
    }

    if ((name === 'href' || name === 'src') && attribute.value) {
      const value = attribute.value.trim()
      if (!value) {
        node.removeAttribute(attribute.name)
        return
      }
      const protocol = value.includes(':') ? value.split(':')[0].toLowerCase() + ':' : ''
      if (protocol && !allowedProtocols.includes(protocol)) {
        node.removeAttribute(attribute.name)
        return
      }
      if (!protocol && value.startsWith('//')) {
        node.removeAttribute(attribute.name)
        return
      }
      if (!protocol && !value.startsWith('#')) {
        node.removeAttribute(attribute.name)
        return
      }
    }

    if (name === 'target') {
      const allowedTargets = new Set(['_blank', '_self'])
      if (!allowedTargets.has(attribute.value)) {
        node.removeAttribute(attribute.name)
        return
      }
      if (attribute.value === '_blank' && !node.getAttribute('rel')) {
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }
  })

  Array.from(node.childNodes || []).forEach(sanitizeNode)
}

export const sanitizeNoteHtml = (value) => {
  const input = typeof value === 'string' ? value : ''
  if (!input) return ''
  if (!isBrowser) {
    return escapeHtml(input)
  }
  const template = document.createElement('template')
  template.innerHTML = input
  Array.from(template.content.childNodes || []).forEach(sanitizeNode)
  return template.innerHTML
}

export default sanitizeNoteHtml
