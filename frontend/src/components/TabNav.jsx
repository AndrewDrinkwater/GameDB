export default function TabNav({ tabs = [], activeTab, onChange }) {
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return null
  }

  const handleSelect = (tabId) => {
    if (typeof onChange === 'function') {
      onChange(tabId)
    }
  }

  return (
    <nav className="tab-nav flex flex-wrap gap-2" role="tablist">
      {tabs.map((tab) => {
        const { id, label } = tab
        const isActive = id === activeTab
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-nav-button whitespace-nowrap px-3 py-2 ${isActive ? 'is-active' : ''}`}
            onClick={() => handleSelect(id)}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}
