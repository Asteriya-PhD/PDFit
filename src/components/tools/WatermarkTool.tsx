import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { addWatermark } from '@/lib/watermark'
import { triggerDownload } from '@/lib/download'
import { Download } from 'lucide-react'
import '@/lib/pdfWorker'
import { getDocument } from 'pdfjs-dist'

const FONT_SIZES = [24, 36, 48, 60, 72, 96, 120]
const COLOR_PRESETS = ['#cccccc', '#999999', '#666666', '#333333', '#d97757', '#6a9bcc']
const PREVIEW_HEIGHT = 400

type WatermarkLayout = 'center' | 'tile' | 'diagonal'

export default function WatermarkTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(60)
  const [opacity, setOpacity] = useState(0.4)
  const [rotation, setRotation] = useState(-45)
  const [color, setColor] = useState('#999999')
  const [layout, setLayout] = useState<WatermarkLayout>('center')
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all')
  const [customPages, setCustomPages] = useState('')

  // Preview state
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0, scale: 1 })
  const [previewReady, setPreviewReady] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  if (!activeFile) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('watermark.noFile')}
        </p>
      </div>
    )
  }

  const rotations = [
    { value: -45, label: t('watermark.rotation.minus45') },
    { value: 0, label: t('watermark.rotation.zero') },
    { value: 45, label: t('watermark.rotation.plus45') },
    { value: 90, label: t('watermark.rotation.ninety') },
  ]

  const layouts: { value: WatermarkLayout; label: string; description: string }[] = [
    { value: 'center', label: 'Center', description: 'Single watermark in center' },
    { value: 'tile', label: 'Tile', description: 'Repeat across page' },
    { value: 'diagonal', label: 'Diagonal', description: 'Diagonal repeat pattern' },
  ]

  const handleApply = async () => {
    if (!text.trim()) {
      alert(t('watermark.error.empty'))
      return
    }
    setLoading(true)
    try {
      const scope = pageScope === 'all' ? 'all' : customPages || 'all'
      const result = await addWatermark(activeFile.arrayBuffer, {
        text: text.trim(),
        fontSize,
        opacity,
        rotation,
        color,
        pageScope: scope,
      })
      const blob = new Blob([result], { type: 'application/pdf' })
      triggerDownload(blob, `watermarked_${activeFile.name}`)
    } catch (err) {
      alert(t('watermark.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
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
        console.error('Watermark preview render error:', err)
      }
    })()

    return () => { cancelled = true }
  }, [activeFile])

  // Render watermark overlay on parameter change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!previewReady || !text.trim() || previewSize.w === 0) return

    debounceRef.current = setTimeout(() => {
      const canvas = overlayCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = previewSize.w
      canvas.height = previewSize.h
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const pageWidth = previewSize.w
      const pageHeight = previewSize.h
      const scaledFontSize = fontSize * previewSize.scale

      ctx.save()
      ctx.globalAlpha = opacity
      ctx.fillStyle = color
      ctx.font = `${scaledFontSize}px Helvetica, Arial, sans-serif`
      ctx.textBaseline = 'alphabetic'

      const textWidth = ctx.measureText(text).width

      if (layout === 'center') {
        // Single centered watermark
        const x = (pageWidth - textWidth) / 2
        const y = pageHeight / 2 + scaledFontSize / 3

        ctx.translate(x, y)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.fillText(text, 0, 0)
      } else if (layout === 'tile') {
        // Tile watermark across page
        const spacingX = textWidth + scaledFontSize * 2
        const spacingY = scaledFontSize * 3

        for (let y = -pageHeight; y < pageHeight * 2; y += spacingY) {
          for (let x = -pageWidth; x < pageWidth * 2; x += spacingX) {
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate((rotation * Math.PI) / 180)
            ctx.fillText(text, 0, 0)
            ctx.restore()
          }
        }
      } else if (layout === 'diagonal') {
        // Diagonal repeating pattern
        const diagonal = Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight)
        const spacing = textWidth + scaledFontSize * 2

        for (let d = -diagonal; d < diagonal * 2; d += spacing) {
          ctx.save()
          ctx.translate(d, pageHeight / 2)
          ctx.rotate((rotation * Math.PI) / 180)
          ctx.fillText(text, 0, 0)
          ctx.restore()
        }
      }

      ctx.restore()
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [text, fontSize, opacity, rotation, color, layout, previewReady, previewSize])

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
          {t('watermark.title')}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {t('watermark.currentFile')}
          <span
            className="font-medium ml-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {activeFile.name}
          </span>
          <span className="ml-2">({activeFile.pageCount} pages)</span>
        </p>

        {/* Watermark Text */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('watermark.text.label')}
          </label>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('watermark.text.placeholder')}
            maxLength={100}
            className="input"
          />
        </div>

        {/* Layout Selection */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-3"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Watermark Layout
          </label>
          <div className="grid grid-cols-3 gap-3">
            {layouts.map(l => (
              <button
                key={l.value}
                onClick={() => setLayout(l.value)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: layout === l.value ? 'var(--color-surface-active)' : 'var(--color-surface)',
                  border: `2px solid ${layout === l.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: layout === l.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {l.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {l.description}
                </span>
              </button>
            ))}
          </div>
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
            {t('watermark.fontSize')}
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

        {/* Opacity */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('watermark.opacity', { value: Math.round(opacity * 100) })}
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={e => setOpacity(parseInt(e.target.value, 10) / 100)}
            className="w-full"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>{t('watermark.opacityLow')}</span>
            <span>{t('watermark.opacityHigh')}</span>
          </div>
        </div>

        {/* Rotation */}
        <div className="mb-5">
          <label
            className="block text-sm font-medium mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('watermark.rotation')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {rotations.map(r => (
              <button
                key={r.value}
                onClick={() => setRotation(r.value)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  fontFamily: 'var(--font-heading)',
                  backgroundColor: rotation === r.value ? 'rgba(217, 119, 87, 0.12)' : 'var(--color-surface)',
                  border: `1px solid ${rotation === r.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: rotation === r.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {r.label}
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
            {t('watermark.color')}
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
                aria-label={t('watermark.colorLabel', { value: c })}
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

        {/* Page Scope */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('watermark.scopeLabel')}
          </label>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setPageScope('all')}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                fontFamily: 'var(--font-heading)',
                backgroundColor: pageScope === 'all' ? 'rgba(217, 119, 87, 0.12)' : 'var(--color-surface)',
                border: `2px solid ${pageScope === 'all' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: pageScope === 'all' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {t('watermark.scope.all')}
            </button>
            <button
              onClick={() => setPageScope('custom')}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                fontFamily: 'var(--font-heading)',
                backgroundColor: pageScope === 'custom' ? 'rgba(217, 119, 87, 0.12)' : 'var(--color-surface)',
                border: `2px solid ${pageScope === 'custom' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: pageScope === 'custom' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {t('watermark.scope.custom')}
            </button>
          </div>
          {pageScope === 'custom' && (
            <input
              type="text"
              value={customPages}
              onChange={e => setCustomPages(e.target.value)}
              placeholder={t('watermark.scopePlaceholder', { count: activeFile.pageCount })}
              className="input"
            />
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleApply}
          disabled={loading || !text.trim()}
          className="btn-primary w-full"
        >
          <Download className="w-4 h-4" />
          {loading ? t('watermark.loading') : t('watermark.button')}
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
          {t('watermark.preview')}
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
                <span className="text-sm">{t('watermark.noFile')}</span>
              </div>
            )}
          </div>
        </div>
        <p
          className="text-center text-xs mt-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {layout === 'center' ? 'Single watermark in center' : layout === 'tile' ? 'Tiled across page' : 'Diagonal repeat pattern'}
        </p>
      </div>
    </div>
  )
}
