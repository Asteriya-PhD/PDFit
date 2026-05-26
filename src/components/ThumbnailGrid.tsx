import { useEffect, useRef, useState, type RefObject } from 'react'
import { useApp } from '@/contexts/AppContext'
import * as pdfjsLib from 'pdfjs-dist'
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`

export default function ThumbnailGrid() {
  const { files, activeFileId, activeTool } = useApp()
  const activeFile = files.find(f => f.id === activeFileId)
  const containerRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const hasPageTools = activeTool === 'split' || activeTool === 'delete' || activeTool === 'rotate'

  if (!activeFile) {
    return (
      <div className="h-32 border-t border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400 shrink-0">
        选择文件以查看预览
      </div>
    )
  }

  const scale = expanded ? 0.5 : 0.35
  const stripHeight = expanded ? 'h-96' : activeTool ? 'h-56' : 'h-48'

  return (
    <div className={`${stripHeight} border-t border-gray-200 bg-gray-50 shrink-0 flex flex-col`}>
      <div className="flex items-center justify-between px-3 py-1 shrink-0">
        <span className="text-xs text-gray-400">
          共 {activeFile.pageCount} 页 · 预览
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? (
            <><Minimize2 className="w-3 h-3" /> 收起</>
          ) : (
            <><Maximize2 className="w-3 h-3" /> 放大预览</>
          )}
        </button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 h-full px-3 pb-3">
          {Array.from({ length: activeFile.pageCount }, (_, i) => (
            <ThumbnailPage
              key={i}
              file={activeFile}
              pageIndex={i}
              scale={scale}
              expanded={expanded}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ThumbnailPage({
  file,
  pageIndex,
  scale,
  expanded,
}: {
  file: { arrayBuffer: ArrayBuffer; name: string }
  pageIndex: number
  scale: number
  expanded: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null) as RefObject<HTMLCanvasElement | null>
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function render() {
      const cvs = canvasRef.current
      if (!cvs) return

      try {
        const pdf = await pdfjsLib.getDocument({ data: file.arrayBuffer.slice(0) }).promise
        if (cancelled) return
        const page = await pdf.getPage(pageIndex + 1)
        if (cancelled) return

        const viewport = page.getViewport({ scale })
        cvs.width = viewport.width
        cvs.height = viewport.height

        const ctx = cvs.getContext('2d')
        if (!ctx) return

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise

        if (!cancelled) setLoaded(true)
      } catch {
        /* thumbnail render error — skip */
      }
    }
    render()
    return () => { cancelled = true }
  }, [file.arrayBuffer, pageIndex, scale])

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className={`
        bg-white rounded border border-gray-200 shadow-sm overflow-hidden transition-shadow
        ${expanded ? 'hover:shadow-lg' : 'hover:shadow-md'}
      `}>
        <canvas ref={canvasRef} className="block" />
      </div>
      <span className={`
        font-medium
        ${expanded ? 'text-xs text-gray-500' : 'text-[10px] text-gray-400'}
      `}>
        {pageIndex + 1}
      </span>
    </div>
  )
}
