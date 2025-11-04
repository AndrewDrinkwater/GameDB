export default function SystemTab({ renderSchemaSections, systemSchema, viewData }) {
  return (
    <div className="entity-tab-content">
      {renderSchemaSections(systemSchema, viewData, 'system')}
    </div>
  )
}
