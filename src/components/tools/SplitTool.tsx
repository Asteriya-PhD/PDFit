import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { extractPages, splitPDFByRanges, parsePageSpec } from '@/lib/pdfEngine'
import { Download, Plus, X } from 'lucide-react'

interface RangeInput {
  id: string
  start: string
  end: string
}

export default function SplitTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [mode, setMode] = useState<'extract' | 'split'>('extract')
  const [spec, setSpec] = useState('')
  const [ranges, setRanges] = useState<RangeInput[]>([
    { id: crypto.randomUUID(), start: '', end: '' },
  ])

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-gray-500 dark:text-gray-400 text-sm py-12">
        {t('split.noFile')}
      </div>
    )
  }

  const handleExtract = async () => {
    const indices = parsePageSpec(spec, activeFile.pageCount)

    if (indices.length === 0) {
      alert(t('split.extract.error'))
      return
    }

    setLoading(true)
    try {
      const result = await extractPages(activeFile.arrayBuffer, indices)
      downloadBlob(result, `extracted_${activeFile.name}`)
    } catch (err) {
      alert(t('split.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
    }
  }

  const handleSplit = async () => {
    const validRanges = ranges
      .map(r => ({
        start: parseInt(r.start, 10),
        end: parseInt(r.end, 10),
      }))
      .filter(r => !isNaN(r.start) && !isNaN(r.end) && r.start >= 1 && r.end <= activeFile.pageCount && r.start <= r.end)

    if (validRanges.length === 0) {
      alert(t('split.split.error'))
      return
    }

    setLoading(true)
    try {
      const results = await splitPDFByRanges(activeFile.arrayBuffer, validRanges)
      if (results.length === 1) {
        downloadBlob(results[0]!.data, results[0]!.name)
      } else {
        const { default: JSZip } = await import('jszip')
        const zip = new JSZip()
        for (const r of results) zip.file(r.name, r.data)
        const zipBlob = await zip.generateAsync({ type: 'uint8array' })
        downloadBlob(zipBlob, `${activeFile.name.replace('.pdf', '')}_split.zip`)
      }
    } catch (err) {
      alert(t('split.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
    }
  }

  const addRange = () => {
    setRanges(prev => [...prev, { id: crypto.randomUUID(), start: '', end: '' }])
  }

  const removeRange = (id: string) => {
    setRanges(prev => prev.filter(r => r.id !== id))
  }

  const updateRange = (id: string, field: 'start' | 'end', value: string) => {
    setRanges(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('split.title')}</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('extract')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'extract'
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {t('split.tab.extract')}
        </button>
        <button
          onClick={() => setMode('split')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'split'
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {t('split.tab.split')}
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {t('split.currentFile')}<span className="font-medium text-gray-700 dark:text-gray-200">{activeFile.name}</span>
        <span className="text-gray-500 dark:text-gray-400 ml-2">{t('split.pageCount', { count: activeFile.pageCount })}</span>
      </p>

      {mode === 'extract' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              {t('split.extract.label')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t('split.extract.hint')}
            </p>
            <input
              type="text"
              value={spec}
              onChange={e => setSpec(e.target.value)}
              placeholder={t('split.extract.placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <button
            onClick={handleExtract}
            disabled={!spec.trim() || loading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
              hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            {loading ? t('split.loading') : t('split.extract.button')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ranges.map((range, index) => (
            <div key={range.id} className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 w-6">#{index + 1}</span>
              <input
                type="number"
                min={1}
                max={activeFile.pageCount}
                value={range.start}
                onChange={e => updateRange(range.id, 'start', e.target.value)}
                placeholder={t('split.split.placeholderStart')}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <span className="text-gray-500 dark:text-gray-400">—</span>
              <input
                type="number"
                min={1}
                max={activeFile.pageCount}
                value={range.end}
                onChange={e => updateRange(range.id, 'end', e.target.value)}
                placeholder={t('split.split.placeholderEnd')}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              {ranges.length > 1 && (
                <button
                  onClick={() => removeRange(range.id)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addRange}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <Plus className="w-4 h-4" /> {t('split.split.addRange')}
          </button>

          <button
            onClick={handleSplit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
              hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            {loading ? t('split.loading') : t('split.split.button')}
          </button>
        </div>
      )}
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
