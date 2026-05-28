import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { mergePDFs } from '@/lib/pdfEngine'
import { ArrowUpDown, Download } from 'lucide-react'

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
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('merge.title')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('merge.description')}
      </p>

      <div className="space-y-2 mb-6">
        {order.map((fileId, index) => {
          const file = files.find(f => f.id === fileId)
          if (!file) return null
          return (
            <div key={fileId} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('merge.pageCount', { count: file.pageCount })}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => moveFile(index, -1)}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ArrowUpDown className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => moveFile(index, 1)}
                  disabled={index === order.length - 1}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
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
        className="w-full flex items-center justify-center gap-2 btn-primary
          disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
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
