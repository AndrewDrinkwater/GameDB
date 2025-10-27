import { Handle, Position } from 'reactflow'

export default function EntityNode({ data }) {
  const isCenter = Boolean(data?.isCenter)
  const label = data?.label || 'Entity'
  const inheritedStyle = data?.style || {}

  const baseStyle = isCenter
    ? {
        border: '2px solid #2563eb',
        background: '#dbeafe',
        color: '#1d4ed8',
        fontWeight: 700,
      }
    : {
        border: '1px solid #cbd5f5',
        background: '#ffffff',
        color: '#0f172a',
        fontWeight: 600,
      }

  const style = { ...baseStyle, ...inheritedStyle }

  return (
    <div
      className="rounded-xl px-4 py-3 shadow-sm text-center text-sm"
      style={style}
    >
      <Handle type="target" position={Position.Top} />
      <div>{label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
