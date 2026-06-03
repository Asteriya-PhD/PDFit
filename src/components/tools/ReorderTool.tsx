import '@/lib/pdfWorker'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { reorderPages } from '@/lib/reorderPages'
import { getDocument } from 'pdfjs-dist'
import { Download, RotateCcw, Move } from 'lucide-react'

const THUMB_HEIGHT = 180

export default function ReorderTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [order, setOrder] = useState<number[]>([])
  const [dragSource, setDragSource] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const pageCount = activeFile?.pageCount ?? 0

  useEffect(() => {
    setOrder(Array.from({ length: pageCount }, (_, i) => i))
    setDropTarget(null)
    setDragSource(null)
  }, [pageCount])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragSource(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (!stripRef.current || dragSource === null) return

    const items = stripRef.current.querySelectorAll<HTMLElement>('[data-page-index]')
    let closestGap = dropTarget
    let closestDist = Infinity

    items.forEach(el => {
      const idx = parseInt(el.dataset.pageIndex ?? '-1', 10)
      if (idx === -1) return
      const rect = el.getBoundingClientRect()
      const midX = rect.left + rect.width / 2
      const dist = Math.abs(e.clientX - midX)
      if (dist < closestDist) {
        closestDist = dist
        closestGap = e.clientX < midX ? idx : idx + 1
      }
    })

    setDropTarget(closestGap)
  }, [dragSource, dropTarget])

  const handleDragEnd = useCallback(() => {
    setDragSource(null)
    setDropTarget(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const src = dragSource
    const tgt = dropTarget
    if (src === null || tgt === null) return

    const newOrder = [...order]
    const [moved] = newOrder.splice(src, 1)
    if (moved === undefined) return
    const insertAt = tgt > src ? tgt - 1 : tgt
    newOrder.splice(insertAt, 0, moved)

    setOrder(newOrder)
    setDragSource(null)
    setDropTarget(null)
  }, [dragSource, dropTarget, order])

  const handleApply = async () => {
    if (!activeFile) return

    const isSame = order.every((v, i) => v === i)
    if (isSame) {
      const blob = new Blob([activeFile.arrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = activeFile.name
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    setLoading(true)
    try {
      const result = await reorderPages(activeFile.arrayBuffer, order)
      const blob = new Blob([result], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reordered_${activeFile.name}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(t('reorder.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setOrder(Array.from({ length: pageCount }, (_, i) => i))
    setDropTarget(null)
    setDragSource(null)
  }

  const isModified = order.some((v, i) => v !== i)

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-sm py-12" style={{ color: 'var(--color-text-muted)' }}>
        {t('reorder.noFile')}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        <span className="flex items-center gap-2">
          <Move className="w-5 h-5" />
          {t('reorder.title')}
        </span>
      </h2>

      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        {t('reorder.currentFile')}<span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{activeFile.name}</span>
        <span className="ml-2">{t('reorder.pageCount', { count: pageCount })}</span>
      </p>

      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>{t('reorder.dragHint')}</p>

      <div
        ref={stripRef}
        className="flex gap-3 px-1 pb-2 overflow-x-auto"
        style={{ minHeight: THUMB_HEIGHT + 36 }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        tabIndex={0}
        role="region"
        aria-label={t('reorder.title')}
      >
        {order.map((pageIdx, displayIdx) => (
          <div key={`${pageIdx}-${displayIdx}`} className="relative shrink-0">
            {dropTarget === displayIdx && (
              <div className="absolute left-0 top-0 bottom-6 w-0.5 bg-[var(--color-accent)] rounded z-10" />
            )}
            <div
              data-page-index={displayIdx}
              draggable
              onDragStart={e => handleDragStart(e, displayIdx)}
              className={`
                flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none
                ${dragSource === displayIdx ? 'opacity-40' : ''}
              `}
            >
              <PagePreview
                arrayBuffer={activeFile.arrayBuffer}
                pageIndex={pageIdx}
                targetPx={THUMB_HEIGHT}
              />
              <span className="font-medium text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{pageIdx + 1}</span>
            </div>
          </div>
        ))}
        {dropTarget === order.length && (
          <div className="relative shrink-0">
            <div className="h-full w-0.5 bg-[var(--color-accent)] rounded" style={{ minHeight: THUMB_HEIGHT }} />
          </div>
        )}
      </div>

      {isModified && (
        <p className="text-xs mt-1 mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {t('reorder.original')}: {order.map(i => i + 1).join(' → ')}
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleApply}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 btn-primary disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {loading ? t('reorder.loading') : t('reorder.button')}
        </button>
        <button
          onClick={handleReset}
          disabled={loading || !isModified}
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)' }}
        >
          <RotateCcw className="w-4 h-4" />
          {t('reorder.reset')}
        </button>
      </div>
    </div>
  )
}

function PagePreview({
  arrayBuffer,
  pageIndex,
  targetPx,
}: {
  arrayBuffer: ArrayBuffer
  pageIndex: number
  targetPx: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cvs = canvasRef.current
    if (!cvs) return
    setError(false)

    ;(async () => {
      try {
        const pdf = await getDocument({ data: arrayBuffer.slice(0) }).promise
        if (cancelled) return
        const page = await pdf.getPage(pageIndex + 1)
        if (cancelled) return

        const rotation = page.rotate
        const unscaled = page.getViewport({ scale: 1, rotation })
        const scale = targetPx / unscaled.height
        const viewport = page.getViewport({ scale, rotation })

        cvs.width = viewport.width
        cvs.height = viewport.height

        const ctx = cvs.getContext('2d')
        if (!ctx) return

        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, cvs.width, cvs.height)
        await page.render({ canvasContext: ctx, viewport }).promise
      } catch {
        if (!cancelled) setError(true)
      }
    })()

    return () => { cancelled = true }
  }, [arrayBuffer, pageIndex, targetPx])

  if (error) {
    return (
      <div
        className="rounded border border-dashed flex items-center justify-center text-xs"
        style={{
          width: targetPx * 0.7,
          height: targetPx,
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
      >
        ✕
      </div>
    )
  }

  return (
    <div
      className="rounded border shadow-sm overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={{ width: canvasRef.current?.width ?? undefined, height: canvasRef.current?.height ?? undefined }}
      />
    </div>
  )
}
