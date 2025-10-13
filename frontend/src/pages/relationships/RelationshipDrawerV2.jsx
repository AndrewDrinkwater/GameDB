import EntityRelationshipForm from './EntityRelationshipForm.jsx'

/**
 * Temporary bridge component that allows the new relationship builder experience
 * to live behind the rel_builder_v2 feature flag. The underlying form will be
 * replaced with the dedicated V2 implementation once it lands, but keeping the
 * prop signature identical ensures the existing screens keep working while we
 * finalise Phase 5 polish.
 */
export default function RelationshipDrawerV2(props) {
  return <EntityRelationshipForm {...props} />
}
