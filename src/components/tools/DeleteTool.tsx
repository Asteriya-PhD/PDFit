import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { deleteSelectedPages } from '@/lib/pdfEngine'
import { Download } from 'lucide-react'

export default function DeleteTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const activeFile = files.find(f => f.id === activeFileId)

  const [selectMode, setSelectMode] = useState<'manual' | 'select'>('manual')
  const [spec, setSpec] = useState('')
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-gray-400 text-sm py-12">
        请先选择一个 PDF 文件
      </div>
    )
  }

  const handleDelete = async () => {
    let toDelete: Set<number>

    if (selectMode === 'manual') {
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
      toDelete = new Set(indices)
    } else {
      if (selectedPages.size === 0) {
        alert('请选择要删除的页面')
        return
      }
      toDelete = selectedPages
    }

    if (toDelete.size >= activeFile.pageCount) {
      alert('不能删除所有页面 — PDF 至少保留一页')
      return
    }

    setLoading(true)
    try {
      const result = await deleteSelectedPages(activeFile.arrayBuffer, toDelete)
      const kept = activeFile.pageCount - toDelete.size
      downloadBlob(result, `trimmed_${activeFile.name}`)
    } catch (err) {
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'))
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
      <h2 className="text-lg font-semibold text-gray-800 mb-4">删除页面</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectMode('manual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectMode === 'manual'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          输入页码
        </button>
        <button
          onClick={() => setSelectMode('select')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectMode === 'select'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          点选页面
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        当前文件: <span className="font-medium text-gray-700">{activeFile.name}</span>
        <span className="text-gray-400 ml-2">({activeFile.pageCount} 页)</span>
      </p>

      {selectMode === 'manual' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              输入要删除的页码
            </label>
            <p className="text-xs text-gray-400 mb-2">
              用逗号分隔，支持范围。例: 1,3,5-7
            </p>
            <input
              type="text"
              value={spec}
              onChange={e => setSpec(e.target.value)}
              placeholder="例: 1,3,5-7"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">点击缩略图选中/取消（红色 = 将要删除）</p>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-lg">
            {Array.from({ length: activeFile.pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => togglePage(i)}
                className={`
                  aspect-[3/4] flex items-center justify-center rounded border text-sm font-medium transition-all
                  ${selectedPages.has(i)
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            已选 {selectedPages.size} 页，剩余 {activeFile.pageCount - selectedPages.size} 页
          </p>
        </div>
      )}

      <button
        onClick={handleDelete}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading ? '处理中...' : '删除并下载'}
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
