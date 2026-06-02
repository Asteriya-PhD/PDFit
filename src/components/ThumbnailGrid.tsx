import '@/lib/pdfWorker'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { getDocument } from 'pdfjs-dist'
import { Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react'

const THUMB_HEIGHT = 180
const EXPANDED_HEIGHT = 400
const SIDEBAR_THUMB_HEIGHT = 120

interface ThumbnailGridProps {
  vertical?: boolean
}

export default function ThumbnailGrid({ vertical = false }: ThumbnailGridProps) {
  const { files, activeFileId } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)
  const [expanded, setExpanded] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [containerWidth, setContainerWidth] = useState(0)

  const checkScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    if (vertical) {
      setCanScrollLeft(el.scrollTop > 10)
      setCanScrollRight(el.scrollTop < el.scrollHeight - el.clientHeight - 10)
    } else {
      setCanScrollLeft(el.scrollLeft > 10)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
    }
  }

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll)
    checkScroll()
    return () => el.removeEventListener('scroll', checkScroll)
  }, [activeFile, vertical])

  useEffect(() => {
    const el = scrollContainerRef.current?.parentElement
    if (!el || !vertical) return
    const measure = () => setContainerWidth(el.clientWidth)
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [activeFile, vertical])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current
    if (!el) return
    const scrollAmount = 300
    if (vertical) {
      el.scrollBy({
        top: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    } else {
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  if (!activeFile) {
    if (vertical) return null
    return (
      <div
        className="h-32 shrink-0 flex items-center justify-center"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('thumbnailGrid.noFile')}
        </p>
      </div>
    )
  }

  const h = vertical
    ? (containerWidth > 0 ? Math.round((containerWidth - 16) * 1.4) : SIDEBAR_THUMB_HEIGHT)
    : (expanded ? EXPANDED_HEIGHT : THUMB_HEIGHT)

  if (vertical) {
    return (
      <div
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-1.5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="text-xs font-medium truncate"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-muted)',
            }}
          >
            {activeFile.name}
          </span>
          <span className="badge badge-orange text-[10px] py-0 px-1.5">
            {activeFile.pageCount}
          </span>
        </div>

        {/* Vertical Thumbnail Strip */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex flex-col gap-1.5 p-1.5">
            {Array.from({ length: activeFile.pageCount }, (_, i) => (
              <PagePreview
                key={`${activeFile.id}-${i}`}
                arrayBuffer={activeFile.arrayBuffer}
                pageIndex={i}
                targetPx={h}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const stripH = h + 52

  return (
    <div
      className="shrink-0 flex flex-col transition-all duration-300"
      style={{
        height: stripH,
        minHeight: stripH,
        maxHeight: stripH,
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-medium"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-muted)',
            }}
          >
            {activeFile.name}
          </span>
          <span
            className="badge badge-orange"
          >
            {activeFile.pageCount} pages
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll Buttons */}
          <button
            onClick={() => scroll('left')}
            className="btn-icon"
            style={{
              width: 28,
              height: 28,
              opacity: canScrollLeft ? 1 : 0.3,
              cursor: canScrollLeft ? 'pointer' : 'default',
            }}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="btn-icon"
            style={{
              width: 28,
              height: 28,
              opacity: canScrollRight ? 1 : 0.3,
              cursor: canScrollRight ? 'pointer' : 'default',
            }}
            disabled={!canScrollRight}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Divider */}
          <div
            className="w-px h-4"
            style={{ backgroundColor: 'var(--color-border)' }}
          />

          {/* Expand Button */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="btn-icon"
            style={{ width: 28, height: 28 }}
          >
            {expanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
        }}
      >
        <div
          className="flex gap-3 px-4 py-3"
          style={{ height: h }}
        >
          {Array.from({ length: activeFile.pageCount }, (_, i) => (
            <PagePreview
              key={i}
              arrayBuffer={activeFile.arrayBuffer}
              pageIndex={i}
              targetPx={h - 32}
            />
          ))}
        </div>
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
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [isHovered, setIsHovered] = useState(false)

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

        if (!cancelled) setSize({ w: cvs.width, h: cvs.height })

        const ctx = cvs.getContext('2d')
        if (!ctx) return

        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        await page.render({ canvasContext: ctx, viewport }).promise
      } catch (err) {
        if (!cancelled) {
          console.error('PagePreview render error:', err)
          setError(true)
        }
      }
    })()

    return () => { cancelled = true }
  }, [arrayBuffer, pageIndex, targetPx])

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center shrink-0 rounded-xl"
        style={{
          width: targetPx * 0.7,
          height: targetPx + 24,
          backgroundColor: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
        }}
      >
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('thumbnailGrid.loadError')}
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center gap-2 shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="rounded-xl overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: `1px solid ${isHovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
          boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: size.w || undefined, height: size.h || undefined }}
        />
      </div>
      <span
        className="text-xs font-medium"
        style={{
          fontFamily: 'var(--font-heading)',
          color: isHovered ? 'var(--color-accent)' : 'var(--color-text-muted)',
        }}
      >
        {pageIndex + 1}
      </span>
    </div>
  )
}
