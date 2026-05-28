import { useCallback, useRef, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { Upload, Plus } from 'lucide-react'
import { openFileDialog } from '@/lib/tauri'
import { isDesktop } from '@/lib/desktop'

export default function FileDropzone({ compact = false }: { compact?: boolean }) {
  const { addFiles } = useApp()
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const fileList = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
      if (fileList.length > 0) addFiles(fileList)
    },
    [addFiles]
  )

  const handleClick = async () => {
    if (isDesktop()) {
      const file = await openFileDialog({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        multiple: true
      })
      if (file) {
        if (Array.isArray(file)) {
          addFiles(file)
        } else {
          addFiles([file])
        }
      }
    } else {
      inputRef.current?.click()
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  if (compact) {
    return (
      <>
        <input ref={inputRef} type="file" accept=".pdf" multiple onChange={handleChange} className="hidden" />
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          className="flex items-center gap-2 m-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
          style={{
            backgroundColor: isDragging ? 'var(--color-surface-active)' : 'var(--color-bg-secondary)',
            border: `1px dashed ${isDragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
            color: 'var(--color-text-muted)',
          }}
        >
          <Plus className="w-4 h-4" />
          <span
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {t('fileDropzone.compact.text')}
          </span>
        </div>
      </>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf" multiple onChange={handleChange} className="hidden" />
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className="dropzone cursor-pointer"
        style={{
          borderColor: isDragging ? 'var(--color-accent)' : undefined,
          backgroundColor: isDragging ? 'var(--color-surface-active)' : undefined,
        }}
      >
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(217, 119, 87, 0.1)' }}
        >
          <Upload className="w-7 h-7" style={{ color: 'var(--color-accent)' }} />
        </div>
        <div className="text-center">
          <p
            className="text-base font-medium"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('fileDropzone.full.text')}
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('fileDropzone.full.hint')}
          </p>
        </div>
      </div>
    </>
  )
}
