import { Info } from 'lucide-react';

import EntityInfoPreview from '../entities/EntityInfoPreview.jsx';

export default function DetailsPanel({ selectedEntity, onClose }) {
  return (
    <div className="w-80 bg-gray-900 text-gray-100 border-l border-gray-700">
      {selectedEntity ? (
        <EntityInfoPreview entityId={selectedEntity} onClose={onClose} />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          <Info size={14} className="mr-2" /> Select a node to view details
        </div>
      )}
    </div>
  );
}
