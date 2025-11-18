import PropTypes from 'prop-types'

export default function EntityPageLayout({ maxWidth = 1280, className = '', children }) {
  const maxWidthValue = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth
  const style = { '--entity-page-max-width': maxWidthValue }

  const layoutClassName = ['entity-page-layout', className].filter(Boolean).join(' ')

  return (
    <div className={layoutClassName} style={style}>
      <div className="entity-page-layout__inner">{children}</div>
    </div>
  )
}

EntityPageLayout.propTypes = {
  maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  children: PropTypes.node,
}
