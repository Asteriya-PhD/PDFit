import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`

export default function ThumbnailGrid() {
  const { files, activeFileId } = useApp()
  const activeFile = files.find(f => f.id === activeFileId)
  const containerRef = useRef<HTMLDivElement>(null)

  if (!activeFile) {
    return (
      <div className="h-32 border-t border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
        选择文件以查看预览
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-40 border-t border-gray-200 bg-gray-50 shrink-0">
      <div className="h-full overflow-x-auto overflow-y-hidden">
        <div className="flex gap-2 h-full p-3">
          {Array.from({ length: activeFile.pageCount }, (_, i) => (
            <ThumbnailPage
              key={i}
              file={activeFile}
              pageIndex={i}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ThumbnailPage({ file, pageIndex }: { file: { arrayBuffer: ArrayBuffer; name: string }; pageIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

        const viewport = page.getViewport({ scale: 0.2 })
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
  }, [file.arrayBuffer, pageIndex])

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <canvas ref={canvasRef} className="block" />
      </div>
      <span className="text-xs text-gray-400">{pageIndex + 1}</span>
    </div>
  )
}
