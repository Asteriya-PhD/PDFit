import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { addPageNumbers } from '@/lib/pageNumbering'
import { triggerDownload } from '@/lib/download'
import type { PageNumberPosition } from '@/types'
import { Download } from 'lucide-react'
import '@/lib/pdfWorker'
import { getDocument } from 'pdfjs-dist'

const FONT_SIZES = [8, 10, 12, 14, 16, 20, 24]
const COLOR_PRESETS = ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#e53e3e']
const PREVIEW_HEIGHT = 400

export default function PageNumberingTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [position, setPosition] = useState<PageNumberPosition>('bottom-center')
  const [startNumber, setStartNumber] = useState(1)
  const [fontSize, setFontSize] = useState(12)
  const [color, setColor] = useState('#000000')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [showTotalPages, setShowTotalPages] = useState(false)

  // Preview state
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0, scale: 1 })
  const [previewReady, setPreviewReady] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-sm py-12" style={{ color: 'var(--color-text-muted)' }}>
        {t('pageNumbering.noFile')}
      </div>
    )
  }

  const positions: { value: PageNumberPosition; label: string }[] = [
    { value: 'bottom-center', label: t('pageNumbering.position.bottomCenter') },
    { value: 'bottom-left', label: t('pageNumbering.position.bottomLeft') },
    { value: 'bottom-right', label: t('pageNumbering.position.bottomRight') },
    { value: 'top-center', label: t('pageNumbering.position.topCenter') },
    { value: 'top-left', label: t('pageNumbering.position.topLeft') },
    { value: 'top-right', label: t('pageNumbering.position.topRight') },
  ]

  const handleAddNumbers = async () => {
    setLoading(true)
    try {
      const result = await addPageNumbers(activeFile.arrayBuffer, {
        startNumber,
        position,
        fontSize,
        color,
        prefix,
        suffix,
        showTotalPages,
      })
      const blob = new Blob([result], { type: 'application/pdf' })
      triggerDownload(blob, `numbered_${activeFile.name}`)
    } catch (err) {
      alert(t('pageNumbering.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
    }
  }

  // Render PDF first page for preview
  useEffect(() => {
    let cancelled = false
    const canvas = pdfCanvasRef.current
    if (!canvas || !activeFile) return

    setPreviewReady(false)

    ;(async () => {
      try {
        const pdf = await getDocument({ data: activeFile.arrayBuffer.slice(0) }).promise
        if (cancelled) return

        const page = await pdf.getPage(1)
        if (cancelled) return

        const rotationAngle = page.rotate
        const unscaled = page.getViewport({ scale: 1, rotation: rotationAngle })
        const renderScale = PREVIEW_HEIGHT / unscaled.height
        const viewport = page.getViewport({ scale: renderScale, rotation: rotationAngle })

        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        await page.render({ canvasContext: ctx, viewport }).promise

        if (!cancelled) {
          setPreviewSize({ w: canvas.width, h: canvas.height, scale: renderScale })
          setPreviewReady(true)
        }
      } catch (err) {
        console.error('PageNumbering preview render error:', err)
      }
    })()

    return () => { cancelled = true }
  }, [activeFile])

  // Render page number overlay on parameter change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!previewReady || previewSize.w === 0) return

    debounceRef.current = setTimeout(() => {
      const canvas = overlayCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = previewSize.w
      canvas.height = previewSize.h
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const pw = previewSize.w
      const ph = previewSize.h
      const scaledFontSize = fontSize * previewSize.scale
      const margin = 24 * previewSize.scale
      const pageNumText = `${prefix}${showTotalPages ? `${startNumber} / ${activeFile.pageCount}` : startNumber}${suffix}`

      ctx.save()
      ctx.fillStyle = color
      ctx.font = `${scaledFontSize}px Helvetica, Arial, sans-serif`
      ctx.textBaseline = 'middle'

      const textWidth = ctx.measureText(pageNumText).width
      let x: number
      let y: number

      const positionMap: Record<string, { x: number; y: number; align: CanvasTextAlign }> = {
        'bottom-center': { x: pw / 2, y: ph - margin, align: 'center' },
        'bottom-left': { x: margin, y: ph - margin, align: 'left' },
        'bottom-right': { x: pw - margin, y: ph - margin, align: 'right' },
        'top-center': { x: pw / 2, y: margin, align: 'center' },
        'top-left': { x: margin, y: margin, align: 'left' },
        'top-right': { x: pw - margin, y: margin, align: 'right' },
      }

      const pos = positionMap[position]
      if (pos) {
        ctx.textAlign = pos.align
        ctx.fillText(pageNumText, pos.x, pos.y)
      }

      ctx.restore()
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [position, startNumber, fontSize, color, prefix, suffix, showTotalPages, previewReady, previewSize, activeFile])

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
          {t('pageNumbering.title')}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {t('pageNumbering.currentFile')}
          <span
            className="font-medium ml-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {activeFile.name}
          </span>
          <span className="ml-2">{t('pageNumbering.pageCount', { count: activeFile.pageCount })}</span>
        </p>

        {/* Position */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('pageNumbering.position')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {positions.map(p => (
              <button
                key={p.value}
                onClick={() => setPosition(p.value)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  fontFamily: 'var(--font-heading)',
                  backgroundColor: position === p.value ? 'rgba(217, 119, 87, 0.12)' : 'var(--color-surface)',
                  border: `1px solid ${position === p.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: position === p.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Number */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-1"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('pageNumbering.startNumber')}
          </label>
          <input
            type="number"
            min={1}
            value={startNumber}
            onChange={e => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="input !w-24"
          />
        </div>

        {/* Font Size */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('pageNumbering.fontSize')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {FONT_SIZES.map(s => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  fontFamily: 'var(--font-heading)',
                  backgroundColor: fontSize === s ? 'rgba(217, 119, 87, 0.12)' : 'var(--color-surface)',
                  border: `1px solid ${fontSize === s ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: fontSize === s ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('pageNumbering.color')}
          </label>
          <div className="flex gap-2 items-center">
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? 'var(--color-accent)' : 'transparent',
                  transform: color === c ? 'scale(1.1)' : 'scale(1)',
                }}
                aria-label={t('pageNumbering.colorLabel', { value: c })}
              />
            ))}
            <label className="relative ml-1 cursor-pointer">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
              />
              <div
                className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center text-xs"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                +
              </div>
            </label>
          </div>
        </div>

        {/* Prefix & Suffix */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('pageNumbering.prefix')}
            </label>
            <input
              type="text"
              value={prefix}
              onChange={e => setPrefix(e.target.value)}
              placeholder={t('pageNumbering.prefixPlaceholder')}
              className="input"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('pageNumbering.suffix')}
            </label>
            <input
              type="text"
              value={suffix}
              onChange={e => setSuffix(e.target.value)}
              placeholder={t('pageNumbering.suffixPlaceholder')}
              className="input"
            />
          </div>
        </div>

        {/* Show Total Pages */}
        <label className="flex items-center gap-2 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={showTotalPages}
            onChange={e => setShowTotalPages(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('pageNumbering.showTotalPages')}
          </span>
        </label>

        {/* Action Button */}
        <button
          onClick={handleAddNumbers}
          disabled={loading}
          className="btn-primary w-full"
        >
          <Download className="w-4 h-4" />
          {loading ? t('pageNumbering.loading') : t('pageNumbering.button')}
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
          {t('pageNumbering.preview')}
        </p>
        <div
          className="preview-box"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            minHeight: PREVIEW_HEIGHT + 40,
          }}
        >
          <div
            className="relative"
            style={{ width: previewSize.w, height: previewSize.h }}
          >
            <canvas
              ref={pdfCanvasRef}
              className="absolute inset-0"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            {!previewReady && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span className="text-sm">{t('pageNumbering.noFile')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
