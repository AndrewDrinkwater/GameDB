export function normaliseListCollectorOption(option) {
  if (!option && option !== 0) return null
  if (typeof option === 'object' && option !== null) {
    const value = option.value ?? option.id ?? option.key ?? option.slug ?? null
    if (value === null || value === undefined) return null
    const label =
      option.label ??
      option.name ??
      option.title ??
      option.username ??
      option.email ??
      String(value)
    return { value: String(value), label: String(label), raw: option }
  }
  const str = String(option)
  return { value: str, label: str, raw: option }
}
