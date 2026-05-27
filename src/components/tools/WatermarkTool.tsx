import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { addWatermark } from '@/lib/watermark'
import { triggerDownload } from '@/lib/download'
import { Download } from 'lucide-react'
import '@/lib/pdfWorker'
import { getDocument } from 'pdfjs-dist'

const FONT_SIZES = [24, 36, 48, 60, 72, 96, 120]
const COLOR_PRESETS = ['#cccccc', '#999999', '#666666', '#333333', '#e53e3e', '#3182ce']
const PREVIEW_HEIGHT = 320

export default function WatermarkTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(60)
  const [opacity, setOpacity] = useState(0.4)
  const [rotation, setRotation] = useState(-45)
  const [color, setColor] = useState('#999999')
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
      <div className="max-w-lg mx-auto text-center text-gray-500 dark:text-gray-400 text-sm py-12">
        {t('watermark.noFile')}
      </div>
    )
  }

  const rotations = [
    { value: -45, label: t('watermark.rotation.minus45') },
    { value: 0, label: t('watermark.rotation.zero') },
    { value: 45, label: t('watermark.rotation.plus45') },
    { value: 90, label: t('watermark.rotation.ninety') },
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
      const x = (pageWidth - textWidth) / 2
      const y = pageHeight / 2 + scaledFontSize / 3

      ctx.translate(x, y)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [text, fontSize, opacity, rotation, color, previewReady, previewSize])

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('watermark.title')}</h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('watermark.currentFile')}<span className="font-medium text-gray-700 dark:text-gray-200">{activeFile.name}</span>
        <span className="text-gray-500 dark:text-gray-400 ml-2">{t('watermark.pageCount', { count: activeFile.pageCount })}</span>
      </p>

      {/* Visual Preview - always show container when file is loaded */}
      <div className="mb-5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <p className="text-xs text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">{t('watermark.preview')}</p>
        <div
          className="relative mx-auto"
          style={{ width: previewSize.w, height: previewSize.h, maxWidth: '100%' }}
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
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              {t('watermark.noFile')}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 mb-6">
        {/* Watermark Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('watermark.text.label')}</label>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('watermark.text.placeholder')}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('watermark.fontSize')}</label>
          <div className="flex gap-2 flex-wrap">
            {FONT_SIZES.map(s => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  fontSize === s
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {t('watermark.opacity', { value: Math.round(opacity * 100) })}
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={e => setOpacity(parseInt(e.target.value, 10) / 100)}
            className="w-full accent-red-600"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{t('watermark.opacityLow')}</span>
            <span>{t('watermark.opacityHigh')}</span>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('watermark.rotation')}</label>
          <div className="grid grid-cols-4 gap-2">
            {rotations.map(r => (
              <button
                key={r.value}
                onClick={() => setRotation(r.value)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  rotation === r.value
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('watermark.color')}</label>
          <div className="flex gap-2 items-center">
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c
                    ? 'border-red-500 scale-110'
                    : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
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
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 hover:border-gray-400">
                +
              </div>
            </label>
          </div>
        </div>

        {/* Page Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('watermark.scopeLabel')}</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setPageScope('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pageScope === 'all'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('watermark.scope.all')}
            </button>
            <button
              onClick={() => setPageScope('custom')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pageScope === 'custom'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          )}
        </div>
      </div>

      <button
        onClick={handleApply}
        disabled={loading || !text.trim()}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading ? t('watermark.loading') : t('watermark.button')}
      </button>
    </div>
  )
}
