export default function SearchBar({ value, onChange, placeholder = 'Search...', ariaLabel }) {
  return (
    <input
      className="search-input compact"
      type="text"
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
