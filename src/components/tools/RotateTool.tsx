import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { rotateSelectedPages } from '@/lib/pdfEngine'
import type { RotationAngle } from '@/types'
import { Download } from 'lucide-react'

export default function RotateTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const [spec, setSpec] = useState('')
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [angle, setAngle] = useState<RotationAngle>(90)

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-gray-400 text-sm py-12">
        {t('rotate.noFile')}
      </div>
    )
  }

  const handleRotate = async () => {
    let pages: number[] = []

    if (scope === 'all') {
      pages = []
    } else if (scope === 'selected') {
      if (selectedPages.size > 0) {
        pages = [...selectedPages].sort()
      } else {
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
          alert(t('rotate.error.empty'))
          return
        }
        pages = indices
      }
    }

    setLoading(true)
    try {
      const result = await rotateSelectedPages(activeFile.arrayBuffer, pages, angle)
      downloadBlob(result, `rotated_${activeFile.name}`)
    } catch (err) {
      alert(t('rotate.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
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

  const angles: { value: RotationAngle; label: string }[] = [
    { value: 90, label: t('rotate.angle.90') },
    { value: 180, label: t('rotate.angle.180') },
    { value: 270, label: t('rotate.angle.270') },
  ]

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('rotate.title')}</h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('rotate.currentFile')}<span className="font-medium text-gray-700 dark:text-gray-200">{activeFile.name}</span>
        <span className="text-gray-400 ml-2">{t('rotate.pageCount', { count: activeFile.pageCount })}</span>
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('rotate.angle.label')}</label>
          <div className="flex gap-2">
            {angles.map(a => (
              <button
                key={a.value}
                onClick={() => setAngle(a.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  angle === a.value
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('rotate.scopeLabel')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setScope('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                scope === 'all'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('rotate.scope.all')}
            </button>
            <button
              onClick={() => setScope('selected')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                scope === 'selected'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('rotate.scope.selected')}
            </button>
          </div>
        </div>

        {scope === 'selected' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              {t('rotate.selectedHint')}
            </p>
            <input
              type="text"
              value={spec}
              onChange={e => setSpec(e.target.value)}
              placeholder={t('rotate.selectedPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {Array.from({ length: activeFile.pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => togglePage(i)}
                  className={`
                    aspect-[3/4] flex items-center justify-center rounded border text-sm font-medium transition-all
                    ${selectedPages.has(i)
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }
                  `}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">{t('rotate.selectedCount', { count: selectedPages.size })}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleRotate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading
          ? t('rotate.loading')
          : scope === 'all'
            ? t('rotate.buttonAll')
            : selectedPages.size > 0
              ? t('rotate.buttonCount', { count: selectedPages.size })
              : t('rotate.buttonSelected')
        }
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
