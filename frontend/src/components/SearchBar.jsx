export default function SearchBar({ value, onChange }) {
  return (
    <input
      className="search-input compact"
      type="text"
      placeholder="Search..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
