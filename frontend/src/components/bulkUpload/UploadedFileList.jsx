import { FileText, Trash2 } from 'lucide-react'
import './UploadedFileList.css'
import formatBytes from '../../utils/formatBytes.js'

export default function UploadedFileList({ files = [], selectedId, onSelect, onDelete }) {
  if (!files.length) {
    return <p className="uploaded-file-list__empty">No files uploaded yet.</p>
  }

  return (
    <ul className="uploaded-file-list">
      {files.map((file) => {
        const isSelected = file.id === selectedId
        return (
          <li
            key={file.id}
            className={`uploaded-file-list__item${isSelected ? ' is-selected' : ''}`}
          >
            <button
              type="button"
              className="uploaded-file-list__select"
              onClick={() => onSelect(isSelected ? null : file.id)}
            >
              <FileText size={16} />
              <span className="uploaded-file-list__name">{file.file_name}</span>
              <span className="uploaded-file-list__meta">{formatBytes(file.size_bytes)}</span>
            </button>
            <button
              type="button"
              className="uploaded-file-list__delete"
              onClick={() => onDelete(file.id)}
              aria-label={`Delete ${file.file_name}`}
            >
              <Trash2 size={16} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
