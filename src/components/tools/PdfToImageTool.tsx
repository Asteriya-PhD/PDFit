import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { renderPagesToImages, imageExtension, type PdfToImageOptions } from '@/lib/pdfToImage'
import { parsePageSpec } from '@/lib/pdfEngine'
import { Download } from 'lucide-react'

export default function PdfToImageTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all')
  const [customSpec, setCustomSpec] = useState('')
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [quality, setQuality] = useState(92)
  const [dpi, setDpi] = useState(150)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-gray-500 dark:text-gray-400 text-sm py-12">
        {t('pdfToImage.noFile')}
      </div>
    )
  }

  const handleExport = async () => {
    const pages = pageScope === 'all'
      ? Array.from({ length: activeFile.pageCount }, (_, i) => i)
      : parsePageSpec(customSpec, activeFile.pageCount)

    if (pages.length === 0) {
      alert(t('pdfToImage.error.page'))
      return
    }

    const options: PdfToImageOptions = {
      dpi,
      format,
      quality: quality / 100,
    }

    setLoading(true)
    setProgress({ done: 0, total: pages.length })

    try {
      const results = await renderPagesToImages(
        activeFile.arrayBuffer,
        pages,
        options,
        (done, total) => setProgress({ done, total })
      )

      const ext = imageExtension(format)
      const baseName = activeFile.name.replace(/\.pdf$/i, '')

      if (results.length === 1) {
        const first = results[0]
        if (!first) return
        downloadBlob(first.blob, `${baseName}_p${first.pageIndex + 1}.${ext}`)
      } else {
        const { default: JSZip } = await import('jszip')
        const zip = new JSZip()
        for (const r of results) {
          zip.file(`${baseName}_p${r.pageIndex + 1}.${ext}`, r.blob)
        }
        const zipData = await zip.generateAsync({ type: 'blob' })
        downloadBlob(zipData, `${baseName}_images.zip`)
      }
    } catch (err) {
      alert(t('pdfToImage.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
      setProgress({ done: 0, total: 0 })
    }
  }

  const showPageInput = pageScope === 'custom'

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('pdfToImage.title')}</h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('pdfToImage.currentFile')}<span className="font-medium text-gray-700 dark:text-gray-200">{activeFile.name}</span>
        <span className="text-gray-500 dark:text-gray-400 ml-2">{t('pdfToImage.pageCount', { count: activeFile.pageCount })}</span>
      </p>

      <div className="space-y-5 mb-6">
        {/* Page selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('pdfToImage.scopeLabel')}</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setPageScope('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pageScope === 'all'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('pdfToImage.scopeAll')}
            </button>
            <button
              onClick={() => setPageScope('custom')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pageScope === 'custom'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('pdfToImage.scopeCustom')}
            </button>
          </div>
          {showPageInput && (
            <input
              type="text"
              value={customSpec}
              onChange={e => setCustomSpec(e.target.value)}
              placeholder={t('pdfToImage.scopePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          )}
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('pdfToImage.format')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('png')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                format === 'png'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('pdfToImage.format.png')}
            </button>
            <button
              onClick={() => setFormat('jpeg')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                format === 'jpeg'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('pdfToImage.format.jpeg')}
            </button>
          </div>
        </div>

        {/* JPEG quality */}
        {format === 'jpeg' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('pdfToImage.jpegQuality', { value: quality })}
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>
        )}

        {/* DPI */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('pdfToImage.dpi')}</label>
          <div className="flex gap-2">
            {[72, 150, 200, 300].map(v => (
              <button
                key={v}
                onClick={() => setDpi(v)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dpi === v
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {dpi === 72 && t('pdfToImage.dpi.72')}
            {dpi === 150 && t('pdfToImage.dpi.150')}
            {dpi === 200 && t('pdfToImage.dpi.200')}
            {dpi === 300 && t('pdfToImage.dpi.300')}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {loading && progress.total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{t('pdfToImage.progress', { done: progress.done, total: progress.total })}</span>
            <span>{Math.round((progress.done / progress.total) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-200"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={loading || (showPageInput && !customSpec.trim())}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading ? t('pdfToImage.loading') : t('pdfToImage.button')}
      </button>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
