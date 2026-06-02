import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { mergePDFs } from '@/lib/pdfEngine'
import { ArrowUpDown, Download, FileText } from 'lucide-react'

export default function MergeTool() {
  const { files, setLoading, loading } = useApp()
  const { t } = useI18n()
  const [order, setOrder] = useState<string[]>(() => files.map(f => f.id))

  if (order.length !== files.length || order.some(id => !files.find(f => f.id === id))) {
    setOrder(files.map(f => f.id))
  }

  const moveFile = (index: number, direction: -1 | 1) => {
    const newOrder = [...order]
    const target = index + direction
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[index], newOrder[target]] = [newOrder[target]!, newOrder[index]!]
    setOrder(newOrder)
  }

  const handleMerge = async () => {
    if (order.length < 2) return
    setLoading(true)
    try {
      const sorted = order.map(id => files.find(f => f.id === id)!.arrayBuffer)
      const result = await mergePDFs(sorted)
      downloadBlob(result, 'merged.pdf')
    } catch (err) {
      alert(t('merge.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2
        className="text-lg font-semibold mb-4"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text-primary)',
        }}
      >
        {t('merge.title')}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
        {t('merge.description')}
      </p>

      <div className="space-y-2 mb-6">
        {order.map((fileId, index) => {
          const file = files.find(f => f.id === fileId)
          if (!file) return null
          return (
            <div
              key={fileId}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span
                className="text-sm font-medium w-6"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {index + 1}
              </span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <FileText className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {file.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('merge.pageCount', { count: file.pageCount })}
                </p>
              </div>
              <div className="flex gap-0.5">
                <button
                  onClick={() => moveFile(index, -1)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => {
                    if (index !== 0) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                      e.currentTarget.style.color = 'var(--color-text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                  }}
                >
                  <ArrowUpDown className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => moveFile(index, 1)}
                  disabled={index === order.length - 1}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => {
                    if (index !== order.length - 1) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                      e.currentTarget.style.color = 'var(--color-text-primary)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                  }}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleMerge}
        disabled={order.length < 2 || loading}
        className="w-full flex items-center justify-center gap-2 btn-primary"
      >
        <Download className="w-4 h-4" />
        {loading ? t('merge.loading') : t('merge.button', { count: order.length })}
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
