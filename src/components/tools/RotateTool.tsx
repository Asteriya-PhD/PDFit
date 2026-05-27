import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { rotateSelectedPages } from '@/lib/pdfEngine'
import type { RotationAngle } from '@/types'
import { Download } from 'lucide-react'

const angles: { value: RotationAngle; label: string }[] = [
  { value: 90, label: '90° 顺时针' },
  { value: 180, label: '180°' },
  { value: 270, label: '90° 逆时针' },
]

export default function RotateTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const activeFile = files.find(f => f.id === activeFileId)

  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const [spec, setSpec] = useState('')
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [angle, setAngle] = useState<RotationAngle>(90)

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-gray-400 text-sm py-12">
        请先选择一个 PDF 文件
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
          alert('请输入有效的页码')
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
      alert('旋转失败: ' + (err instanceof Error ? err.message : '未知错误'))
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

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">旋转页面</h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        当前文件: <span className="font-medium text-gray-700 dark:text-gray-200">{activeFile.name}</span>
        <span className="text-gray-400 ml-2">({activeFile.pageCount} 页)</span>
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">旋转角度</label>
          <div className="flex gap-2">
            {angles.map(a => (
              <button
                key={a.value}
                onClick={() => setAngle(a.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  angle === a.value
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">应用范围</label>
          <div className="flex gap-2">
            <button
              onClick={() => setScope('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                scope === 'all'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              全部页面
            </button>
            <button
              onClick={() => setScope('selected')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                scope === 'selected'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              指定页面
            </button>
          </div>
        </div>

        {scope === 'selected' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              点击下方的页面编号选择要旋转的页面，或在输入框中输入页码
            </p>
            <input
              type="text"
              value={spec}
              onChange={e => setSpec(e.target.value)}
              placeholder="也可在此输入页码，例: 1,3,5-7"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {Array.from({ length: activeFile.pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => togglePage(i)}
                  className={`
                    aspect-[3/4] flex items-center justify-center rounded border text-sm font-medium transition-all
                    ${selectedPages.has(i)
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }
                  `}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">已选 {selectedPages.size} 页</p>
          </div>
        )}
      </div>

      <button
        onClick={handleRotate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading ? '处理中...' : `旋转 ${scope === 'all' ? '全部页面' : selectedPages.size > 0 ? selectedPages.size + ' 页' : '所选页面'}`}
      </button>
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
