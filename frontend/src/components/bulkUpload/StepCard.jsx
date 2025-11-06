import './StepCard.css'

export default function StepCard({ step, title, subtitle, children, disabled = false }) {
  return (
    <section
      className={`step-card${disabled ? ' step-card--disabled' : ''}`}
      aria-disabled={disabled}
    >
      <header className="step-card__header">
        <span className="step-card__badge">{step}</span>
        <div>
          <h3 className="step-card__title">{title}</h3>
          {subtitle && <p className="step-card__subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="step-card__body">{children}</div>
    </section>
  )
}
