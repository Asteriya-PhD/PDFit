import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { rotateSelectedPages } from '@/lib/pdfEngine'
import type { RotationAngle } from '@/types'
import { Download, RotateCw } from 'lucide-react'

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
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('rotate.noFile')}
        </p>
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

  const angles: { value: RotationAngle; label: string; icon: string }[] = [
    { value: 90, label: t('rotate.angle.90'), icon: '90°' },
    { value: 180, label: t('rotate.angle.180'), icon: '180°' },
    { value: 270, label: t('rotate.angle.270'), icon: '270°' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Controls */}
      <div>
        <h2
          className="text-xl mb-2"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {t('rotate.title')}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {t('rotate.currentFile')}
          <span
            className="font-medium ml-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {activeFile.name}
          </span>
          <span className="ml-2">{t('rotate.pageCount', { count: activeFile.pageCount })}</span>
        </p>

        {/* Angle Selection */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-3"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('rotate.angle.label')}
          </label>
          <div className="flex gap-3">
            {angles.map(a => (
              <button
                key={a.value}
                onClick={() => setAngle(a.value)}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                style={{
                  backgroundColor: angle === a.value ? 'var(--color-surface-active)' : 'var(--color-surface)',
                  border: `2px solid ${angle === a.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: angle === a.value ? 'var(--color-accent-700)' : 'var(--color-text-secondary)',
                }}
              >
                <RotateCw
                  className="w-6 h-6"
                  style={{
                    transform: `rotate(${a.value}deg)`,
                  }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Scope Selection */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-3"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('rotate.scopeLabel')}
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setScope('all')}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                fontFamily: 'var(--font-heading)',
                backgroundColor: scope === 'all' ? 'var(--color-surface-active)' : 'var(--color-surface)',
                border: `2px solid ${scope === 'all' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: scope === 'all' ? 'var(--color-accent-700)' : 'var(--color-text-secondary)',
              }}
            >
              {t('rotate.scope.all')}
            </button>
            <button
              onClick={() => setScope('selected')}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                fontFamily: 'var(--font-heading)',
                backgroundColor: scope === 'selected' ? 'var(--color-surface-active)' : 'var(--color-surface)',
                border: `2px solid ${scope === 'selected' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: scope === 'selected' ? 'var(--color-accent-700)' : 'var(--color-text-secondary)',
              }}
            >
              {t('rotate.scope.selected')}
            </button>
          </div>
        </div>

        {/* Page Selection */}
        {scope === 'selected' && (
          <div className="mb-6">
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('rotate.selectedHint')}
            </p>
            <input
              type="text"
              value={spec}
              onChange={e => setSpec(e.target.value)}
              placeholder={t('rotate.selectedPlaceholder')}
              className="input mb-3"
            />
            <div
              className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-3 rounded-xl"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
              tabIndex={0}
              role="group"
              aria-label={t('rotate.selectedHint')}
            >
              {Array.from({ length: activeFile.pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => togglePage(i)}
                  className="aspect-[3/4] flex items-center justify-center rounded-lg text-sm font-medium transition-all"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    backgroundColor: selectedPages.has(i) ? 'var(--color-accent-100)' : 'var(--color-surface)',
                    border: `1px solid ${selectedPages.has(i) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: selectedPages.has(i) ? 'var(--color-accent-700)' : 'var(--color-text-secondary)',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('rotate.selectedCount', { count: selectedPages.size })}
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleRotate}
          disabled={loading}
          className="btn-primary w-full"
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

      {/* Right: Preview */}
      <div>
        <p
          className="text-sm font-medium mb-3"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('rotate.preview')}
        </p>
        <div
          className="preview-box aspect-[3/4] max-w-xs mx-auto"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
        >
          <div className="relative">
            {/* Simulated Page */}
            <div
              className="w-48 h-64 rounded-lg shadow-lg flex items-center justify-center transition-transform duration-500"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                transform: `rotate(${angle}deg)`,
              }}
            >
              <div className="text-center">
                <RotateCw
                  className="w-12 h-12 mx-auto mb-2"
                  style={{ color: 'var(--color-accent)' }}
                />
                <p
                  className="text-sm font-medium"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {angle}°
                </p>
              </div>
            </div>

            {/* Page Number */}
            <div
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                fontFamily: 'var(--font-heading)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              {t('rotate.previewPage', { n: 1 })}
            </div>
          </div>
        </div>
        <p
          className="text-center text-xs mt-8"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {scope === 'all' ? t('rotate.previewStatus.all') : t('rotate.previewStatus.selected', { count: selectedPages.size })}
        </p>
      </div>
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
