import { useApp } from '@/contexts/AppContext'
import { FileText, X, File as FileIcon } from 'lucide-react'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileList() {
  const { files, activeFileId, setActiveFile, removeFile } = useApp()

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4">
        暂无文件
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
        文件列表 ({files.length})
      </div>
      <div className="space-y-0.5 px-2 pb-2">
        {files.map(file => (
          <div
            key={file.id}
            onClick={() => setActiveFile(file.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors group
              ${activeFileId === file.id
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'text-gray-700 hover:bg-gray-100 border border-transparent'
              }
            `}
          >
            <FileIcon className="w-4 h-4 shrink-0 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-xs text-gray-400">
                {file.pageCount} 页 · {formatSize(file.size)}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); removeFile(file.id) }}
              className="shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
