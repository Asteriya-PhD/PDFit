import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { deleteSelectedPages } from '@/lib/pdfEngine'
import { Download } from 'lucide-react'

export default function DeleteTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [selectMode, setSelectMode] = useState<'manual' | 'select'>('manual')
  const [spec, setSpec] = useState('')
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-sm py-12" style={{ color: 'var(--color-text-muted)' }}>
        {t('delete.noFile')}
      </div>
    )
  }

  const handleDelete = async () => {
    let toDelete: Set<number>

    if (selectMode === 'manual') {
      const indices = spec
        .split(',')
        .map(s => s.trim())
        .flatMap(s => {
          const m = s.match(/^(\d+)\s*-\s*(\d+)$/)
          if (m) {
            const start = Math.max(1, parseInt(m[1]!, 10))
            const end = Math.min(activeFile.pageCount, parseInt(m[2]!, 10))
            const result: number[] = []
            for (let i = start; i <= end; i++) result.push(i - 1)
            return result
          }
          const n = parseInt(s, 10)
          return !isNaN(n) && n >= 1 && n <= activeFile.pageCount ? [n - 1] : []
        })

      if (indices.length === 0) {
        alert(t('delete.error.empty'))
        return
      }
      toDelete = new Set(indices)
    } else {
      if (selectedPages.size === 0) {
        alert(t('delete.error.select'))
        return
      }
      toDelete = selectedPages
    }

    if (toDelete.size >= activeFile.pageCount) {
      alert(t('delete.error.allPages'))
      return
    }

    setLoading(true)
    try {
      const result = await deleteSelectedPages(activeFile.arrayBuffer, toDelete)
      downloadBlob(result, `trimmed_${activeFile.name}`)
    } catch (err) {
      alert(t('delete.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
    }
  }

  const togglePage = (pageIndex: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      return next
    })
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{t('delete.title')}</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectMode('manual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectMode === 'manual'
              ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-700)] border-[var(--color-accent)]'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
          }`}
        >
          {t('delete.tab.manual')}
        </button>
        <button
          onClick={() => setSelectMode('select')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectMode === 'select'
              ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-700)] border-[var(--color-accent)]'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
          }`}
        >
          {t('delete.tab.select')}
        </button>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        {t('delete.currentFile')}<span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{activeFile.name}</span>
        <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>{t('delete.pageCount', { count: activeFile.pageCount })}</span>
      </p>

      {selectMode === 'manual' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {t('delete.manual.label')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('delete.manual.hint')}
            </p>
            <input
              type="text"
              value={spec}
              onChange={e => setSpec(e.target.value)}
              placeholder={t('delete.manual.placeholder')}
              className="input"
            />
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('delete.select.hint')}</p>
          <div
            className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            tabIndex={0}
            role="group"
            aria-label={t('delete.select.hint')}
          >
            {Array.from({ length: activeFile.pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => togglePage(i)}
                className={`
                  aspect-[3/4] flex items-center justify-center rounded border text-sm font-medium transition-all
                  ${selectedPages.has(i)
                    ? 'bg-[var(--color-accent-100)] border-[var(--color-accent)] text-[var(--color-accent-700)]'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }
                `}
                style={!selectedPages.has(i) ? { color: 'var(--color-text-secondary)' } : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {t('delete.select.count', { count: selectedPages.size, remaining: activeFile.pageCount - selectedPages.size })}
          </p>
        </div>
      )}

      <button
        onClick={handleDelete}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 btn-primary disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        {loading ? t('delete.loading') : t('delete.button')}
      </button>
    </div>
  )
}

function downloadBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
