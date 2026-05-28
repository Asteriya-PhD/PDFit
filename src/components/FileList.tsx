import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { FileText, X, File as FileIcon, Plus } from 'lucide-react'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileList() {
  const { files, activeFileId, setActiveFile, removeFile, addFiles } = useApp()
  const { t } = useI18n()

  const handleAddMore = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.multiple = true
    input.onchange = async () => {
      if (input.files) addFiles(Array.from(input.files))
    }
    input.click()
  }

  if (files.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center p-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <p className="text-sm">{t('fileList.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-muted)',
          }}
        >
          {t('fileList.header', { count: files.length })}
        </span>
        <button
          onClick={handleAddMore}
          className="btn-icon"
          style={{ width: 28, height: 28 }}
          title={t('fileList.addMore')}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-1">
          {files.map(file => {
            const isActive = activeFileId === file.id
            return (
              <div
                key={file.id}
                onClick={() => setActiveFile(file.id)}
                className="group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--color-surface-active)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {/* File Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isActive ? 'rgba(217, 119, 87, 0.12)' : 'var(--color-bg-tertiary)',
                  }}
                >
                  <FileIcon
                    className="w-5 h-5"
                    style={{
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate text-sm font-medium"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    }}
                  >
                    {file.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {file.pageCount} pages · {formatSize(file.size)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={e => { e.stopPropagation(); removeFile(file.id) }}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    color: 'var(--color-text-muted)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                    e.currentTarget.style.color = 'var(--color-text-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
