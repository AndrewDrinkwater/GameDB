/**
 * Formats a date/time value as "dd/mm/yyyy HH:mm"
 * @param {string|Date|number} value - The date value to format
 * @returns {string} - Formatted date string or '—' if invalid
 */
export const formatDateTime = (value) => {
  if (!value) return '—'
  
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '—'
  }
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

