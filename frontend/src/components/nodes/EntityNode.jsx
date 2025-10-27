import { Handle, Position } from 'reactflow'

export default function EntityNode({ data }) {
  const isCenter = Boolean(data?.isCenter)
  const label = data?.label || 'Entity'
  const inheritedStyle = data?.style || {}

  const baseClasses =
    'relative flex flex-col items-center gap-1 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg'

  const variantClasses = isCenter
    ? 'border-blue-500/70 bg-gradient-to-b from-blue-100 via-white to-blue-50 text-blue-900'
    : 'border-slate-200 bg-white text-slate-900'

  const helperText = isCenter ? 'Primary entity' : 'Related entity'

  return (
    <div
      className={`${baseClasses} ${variantClasses}`}
      style={{ ...inheritedStyle }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="text-base leading-tight text-center">{label}</div>
      <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
        {helperText}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
