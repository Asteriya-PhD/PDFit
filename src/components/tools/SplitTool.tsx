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
      <div className="max-w-lg mx-auto text-center text-sm py-12" style={{ color: 'var(--color-text-muted)' }}>
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

  const tabBase = 'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border'
  const tabActive = `${tabBase}`
  const tabInactive = `${tabBase} transition-colors`

  return (
    <div className="max-w-lg mx-auto">
      <h2
        className="text-lg font-semibold mb-4"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text-primary)',
        }}
      >
        {t('split.title')}
      </h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('extract')}
          className={mode === 'extract' ? tabActive : tabInactive}
          style={
            mode === 'extract'
              ? {
                  backgroundColor: 'var(--color-accent-100)',
                  color: 'var(--color-accent-700)',
                  borderColor: 'var(--color-accent)',
                }
              : {
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  borderColor: 'var(--color-border)',
                }
          }
          onMouseEnter={e => {
            if (mode !== 'extract') {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
            }
          }}
          onMouseLeave={e => {
            if (mode !== 'extract') {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
            }
          }}
        >
          {t('split.tab.extract')}
        </button>
        <button
          onClick={() => setMode('split')}
          className={mode === 'split' ? tabActive : tabInactive}
          style={
            mode === 'split'
              ? {
                  backgroundColor: 'var(--color-accent-100)',
                  color: 'var(--color-accent-700)',
                  borderColor: 'var(--color-accent)',
                }
              : {
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  borderColor: 'var(--color-border)',
                }
          }
          onMouseEnter={e => {
            if (mode !== 'split') {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
            }
          }}
          onMouseLeave={e => {
            if (mode !== 'split') {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
            }
          }}
        >
          {t('split.tab.split')}
        </button>
      </div>

      <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
        {t('split.currentFile')}
        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{activeFile.name}</span>
        <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>{t('split.pageCount', { count: activeFile.pageCount })}</span>
      </p>

      {mode === 'extract' ? (
        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('split.extract.label')}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('split.extract.hint')}
            </p>
            <input
              type="text"
              value={spec}
              onChange={e => setSpec(e.target.value)}
              placeholder={t('split.extract.placeholder')}
              className="input"
            />
          </div>
          <button
            onClick={handleExtract}
            disabled={!spec.trim() || loading}
            className="w-full flex items-center justify-center gap-2 btn-primary"
          >
            <Download className="w-4 h-4" />
            {loading ? t('split.loading') : t('split.extract.button')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ranges.map((range, index) => (
            <div key={range.id} className="flex items-center gap-2">
              <span className="text-sm w-6" style={{ color: 'var(--color-text-muted)' }}>#{index + 1}</span>
              <label htmlFor={`split-start-${range.id}`} className="sr-only">
                {t('split.split.placeholderStart')}
              </label>
              <input
                id={`split-start-${range.id}`}
                type="number"
                min={1}
                max={activeFile.pageCount}
                value={range.start}
                onChange={e => updateRange(range.id, 'start', e.target.value)}
                placeholder={t('split.split.placeholderStart')}
                className="input w-24"
              />
              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
              <label htmlFor={`split-end-${range.id}`} className="sr-only">
                {t('split.split.placeholderEnd')}
              </label>
              <input
                id={`split-end-${range.id}`}
                type="number"
                min={1}
                max={activeFile.pageCount}
                value={range.end}
                onChange={e => updateRange(range.id, 'end', e.target.value)}
                placeholder={t('split.split.placeholderEnd')}
                className="input w-24"
              />
              {ranges.length > 1 && (
                <button
                  onClick={() => removeRange(range.id)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label={t('common.remove')}
                  title={t('common.remove')}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                    e.currentTarget.style.color = 'var(--color-accent)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addRange}
            className="flex items-center gap-1 text-sm font-medium transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" /> {t('split.split.addRange')}
          </button>

          <button
            onClick={handleSplit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 btn-primary"
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
