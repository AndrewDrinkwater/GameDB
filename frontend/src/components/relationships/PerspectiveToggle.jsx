const OPTIONS = [
  { value: 'source', label: 'This entity is the source' },
  { value: 'target', label: 'This entity is the target' },
]

export default function PerspectiveToggle({ value, onChange, disabled = false }) {
  const handleChange = (event) => {
    const nextValue = event.target.value === 'target' ? 'target' : 'source'
    if (nextValue !== value) {
      onChange?.(nextValue)
    }
  }

  return (
    <fieldset className="perspective-toggle" disabled={disabled}>
      <legend>Relationship Perspective</legend>
      <div role="radiogroup" aria-label="Relationship perspective" className="perspective-toggle-options">
        {OPTIONS.map((option) => {
          const classes = ['perspective-toggle-option']
          if (option.value === value) classes.push('active')
          if (disabled) classes.push('disabled')
          return (
            <label key={option.value} className={classes.join(' ')}>
              <input
                type="radio"
                name="relationship-perspective"
                value={option.value}
                checked={value === option.value}
                onChange={handleChange}
                disabled={disabled}
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
