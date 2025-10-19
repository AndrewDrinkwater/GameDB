import { Filter } from 'lucide-react';

export default function FilterPanel({ depth, onDepthChange, onApply }) {
  const handleDepthInput = (event) => {
    const parsed = parseInt(event.target.value, 10);
    const nextDepth = Number.isNaN(parsed) ? 1 : parsed;
    onDepthChange(nextDepth);
  };

  return (
    <div className="w-64 bg-gray-900 text-gray-100 border-r border-gray-700 p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Filter size={16} /> Filters
      </div>
      <label className="text-xs mt-2">Depth</label>
      <input
        type="number"
        min={1}
        max={3}
        value={depth}
        onChange={handleDepthInput}
        className="bg-gray-800 border border-gray-700 p-1 rounded text-sm"
      />
      <button
        onClick={onApply}
        className="mt-auto bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-sm"
      >
        Apply
      </button>
    </div>
  );
}
