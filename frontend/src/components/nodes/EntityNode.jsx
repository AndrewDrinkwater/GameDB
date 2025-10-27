import { Handle, Position } from 'reactflow'

export default function EntityNode({ data }) {
  const isCenter = Boolean(data?.isCenter)
  const label = data?.label || 'Entity'
  const typeName = data?.typeName || 'Entity'
  const inheritedStyle = data?.style || {}

  const baseClasses =
    'group relative flex min-w-[200px] max-w-[260px] cursor-grab flex-col items-stretch gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing'

  const variantClasses = isCenter
    ? 'border-blue-400/80 bg-gradient-to-br from-blue-50 via-white to-blue-100 text-blue-900 shadow-blue-200/60 ring-2 ring-blue-300 ring-offset-2'
    : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'

  const typePillClasses = isCenter
    ? 'bg-blue-500/10 text-blue-700'
    : 'bg-slate-100 text-slate-600'

  return (
    <div className={`${baseClasses} ${variantClasses}`} style={{ ...inheritedStyle }}>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-slate-300 border border-white shadow-sm"
      />

      {isCenter && (
        <span className="pointer-events-none absolute -top-2 right-6 h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_0_5px_rgba(59,130,246,0.25)]" />
      )}

      <div className="flex flex-col items-center text-center">
        <div className="w-full truncate text-base leading-tight text-current">
          {label}
        </div>
        {typeName && (
          <div
            className={`mt-2 inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${typePillClasses}`}
          >
            {typeName}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-slate-300 border border-white shadow-sm"
      />
    </div>
  )
}
