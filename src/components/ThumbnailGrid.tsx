import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import { Maximize2, Minimize2 } from 'lucide-react'

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`

export default function ThumbnailGrid() {
  const { files, activeFileId } = useApp()
  const activeFile = files.find(f => f.id === activeFileId)
  const [expanded, setExpanded] = useState(false)

  if (!activeFile) {
    return (
      <div className="h-32 border-t border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400 shrink-0">
        选择文件以查看预览
      </div>
    )
  }

  const scale = expanded ? 0.7 : 0.35
  const stripHeight = expanded ? 'min-h-[70vh] max-h-[70vh]' : 'min-h-[180px] max-h-[180px]'

  return (
    <div className={`${stripHeight} border-t border-gray-200 bg-gray-50 shrink-0 flex flex-col transition-all duration-200`}>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0">
        <span className="text-xs text-gray-400">
          {activeFile.name} · 共 {activeFile.pageCount} 页
        </span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          {expanded ? (
            <><Minimize2 className="w-3.5 h-3.5" /> 收起预览</>
          ) : (
            <><Maximize2 className="w-3.5 h-3.5" /> 放大预览</>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 h-full px-4 pb-3">
          {Array.from({ length: activeFile.pageCount }, (_, i) => (
            <PagePreview
              key={i}
              arrayBuffer={activeFile.arrayBuffer}
              pageIndex={i}
              scale={scale}
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
  scale,
}: {
  arrayBuffer: ArrayBuffer
  pageIndex: number
  scale: number
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
  }, [arrayBuffer, pageIndex, scale])

  if (error) {
    return (
      <div
        className="bg-white rounded border border-dashed border-gray-300 flex items-center justify-center shrink-0 text-xs text-gray-400"
        style={{ width: scale * 400, height: scale * 500 }}
      >
        加载失败
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className={`bg-white rounded border border-gray-200 shadow-sm overflow-hidden`}>
        <canvas ref={canvasRef} className="block" />
      </div>
      <span className="font-medium text-[10px] text-gray-400">{pageIndex + 1}</span>
    </div>
  )
}
