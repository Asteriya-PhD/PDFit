import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { FileText, X, File as FileIcon } from 'lucide-react'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileList() {
  const { files, activeFileId, setActiveFile, removeFile } = useApp()
  const { t } = useI18n()

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 p-4">
        {t('fileList.empty')}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {t('fileList.header', { count: files.length })}
      </div>
      <div className="space-y-0.5 px-2 pb-2">
        {files.map(file => (
          <div
            key={file.id}
            onClick={() => setActiveFile(file.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors group
              ${activeFileId === file.id
                ? 'bg-red-50 dark:bg-blue-900/30 text-red-700 dark:text-blue-400 border border-red-200 dark:border-blue-800'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
              }
            `}
          >
            <FileIcon className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('fileList.pageCount', { count: file.pageCount, size: formatSize(file.size) })}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); removeFile(file.id) }}
              className="shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
