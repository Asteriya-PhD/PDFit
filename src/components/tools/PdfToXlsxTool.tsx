import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { pdfToXlsx, NoTableError } from '@/lib/pdfToXlsx'
import { Download, Sheet } from 'lucide-react'

export default function PdfToXlsxTool() {
  const { files, activeFileId } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState<{ bytes: Uint8Array; totalPages: number; tablePages: number; cellCount: number } | null>(null)
  const [isEmpty, setIsEmpty] = useState(false)
  const [noTable, setNoTable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-sm py-12" style={{ color: 'var(--color-text-muted)' }}>
        {t('pdfToXlsx.noFile')}
      </div>
    )
  }

  const handleConvert = async () => {
    setLoading(true)
    setResult(null)
    setIsEmpty(false)
    setNoTable(false)
    setError(null)
    setProgress({ done: 0, total: 0 })

    try {
      const r = await pdfToXlsx(
        activeFile.arrayBuffer,
        (done, total) => setProgress({ done, total })
      )
      setResult(r)
    } catch (err) {
      if (err instanceof Error && err.message === 'EMPTY_PDF') {
        setIsEmpty(true)
      } else if (err instanceof NoTableError) {
        setNoTable(true)
      } else {
        setError(err instanceof Error ? err.message : t('common.error.default'))
      }
    } finally {
      setLoading(false)
      setProgress({ done: 0, total: 0 })
    }
  }

  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([result.bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.name.replace(/\.pdf$/i, '') + '.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setResult(null)
    setIsEmpty(false)
    setNoTable(false)
    setError(null)
  }

  const showResult = result !== null || isEmpty || noTable || error !== null

  return (
    <div className="max-w-2xl mx-auto">
      <h2
        className="text-lg font-semibold mb-4"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text-primary)',
        }}
      >
        {t('pdfToXlsx.title')}
      </h2>

      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        {t('pdfToXlsx.currentFile')}
        <span className="font-medium ml-1" style={{ color: 'var(--color-text-primary)' }}>{activeFile.name}</span>
        <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>{t('pdfToXlsx.pageCount', { count: activeFile.pageCount })}</span>
      </p>

      {!showResult && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('pdfToXlsx.description')}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('pdfToXlsx.limitation')}
          </p>

          {loading && progress.total > 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>{t('pdfToXlsx.progress', { done: progress.done, total: progress.total })}</span>
                <span>{Math.round((progress.done / progress.total) * 100)}%</span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleConvert}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 btn-primary"
          >
            <Sheet className="w-4 h-4" />
            {loading ? t('pdfToXlsx.loading') : t('pdfToXlsx.button')}
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="text-center py-8">
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('pdfToXlsx.empty.title')}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('pdfToXlsx.empty.hint')}
          </p>
        </div>
      )}

      {noTable && (
        <div className="text-center py-8">
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('pdfToXlsx.noTable.title')}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('pdfToXlsx.noTable.hint')}
          </p>
        </div>
      )}

      {error && (
        <div
          className="text-sm rounded-md p-3"
          style={{
            backgroundColor: 'var(--color-accent-100)',
            color: 'var(--color-accent-700)',
          }}
        >
          {t('pdfToXlsx.error', { message: error })}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div
            className="rounded-lg border p-4 flex items-center gap-3"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Sheet className="w-8 h-8 shrink-0" style={{ color: 'var(--color-accent)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {activeFile.name.replace(/\.pdf$/i, '') + '.xlsx'}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('pdfToXlsx.stats', {
                  pages: result.tablePages,
                  cells: result.cellCount,
                  size: (result.bytes.byteLength / 1024).toFixed(1),
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownload}
              className="btn-primary flex items-center gap-2"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <Download className="w-4 h-4" />
              {t('pdfToXlsx.download')}
            </button>
            <button
              onClick={handleReset}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {t('pdfToXlsx.reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
