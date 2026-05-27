import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { addPageNumbers } from '@/lib/pageNumbering'
import { triggerDownload } from '@/lib/download'
import type { PageNumberPosition } from '@/types'
import { Download, Hash } from 'lucide-react'

const positions: { value: PageNumberPosition; label: string }[] = [
  { value: 'bottom-center', label: '底部居中' },
  { value: 'bottom-left', label: '底部左对齐' },
  { value: 'bottom-right', label: '底部右对齐' },
  { value: 'top-center', label: '顶部居中' },
  { value: 'top-left', label: '顶部左对齐' },
  { value: 'top-right', label: '顶部右对齐' },
]

const FONT_SIZES = [8, 10, 12, 14, 16, 20, 24]
const COLOR_PRESETS = ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#e53e3e']

export default function PageNumberingTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const activeFile = files.find(f => f.id === activeFileId)

  const [position, setPosition] = useState<PageNumberPosition>('bottom-center')
  const [startNumber, setStartNumber] = useState(1)
  const [fontSize, setFontSize] = useState(12)
  const [color, setColor] = useState('#000000')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [showTotalPages, setShowTotalPages] = useState(false)

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-gray-400 text-sm py-12">
        请先选择一个 PDF 文件
      </div>
    )
  }

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
      alert('添加页码失败: ' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加页码</h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        当前文件: <span className="font-medium text-gray-700 dark:text-gray-200">{activeFile.name}</span>
        <span className="text-gray-400 ml-2">({activeFile.pageCount} 页)</span>
      </p>

      <div className="space-y-5 mb-6">
        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">位置</label>
          <div className="grid grid-cols-3 gap-2">
            {positions.map(p => (
              <button
                key={p.value}
                onClick={() => setPosition(p.value)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  position === p.value
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">起始页码</label>
          <input
            type="number"
            min={1}
            value={startNumber}
            onChange={e => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">字号</label>
          <div className="flex gap-2">
            {FONT_SIZES.map(s => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`w-10 h-9 rounded-md text-sm font-medium transition-colors ${
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

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">颜色</label>
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
                aria-label={`颜色 ${c}`}
              />
            ))}
            <label className="relative ml-1 cursor-pointer">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
              />
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-400 hover:border-gray-400">
                +
              </div>
            </label>
          </div>
        </div>

        {/* Prefix & Suffix */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">前缀</label>
            <input
              type="text"
              value={prefix}
              onChange={e => setPrefix(e.target.value)}
              placeholder="如: - "
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">后缀</label>
            <input
              type="text"
              value={suffix}
              onChange={e => setSuffix(e.target.value)}
              placeholder="如: -"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Show Total Pages */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTotalPages}
            onChange={e => setShowTotalPages(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">显示总页数（格式: 1 / 10）</span>
        </label>

        {/* Preview */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-1">预览</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
            {prefix}{showTotalPages ? `${startNumber} / ${activeFile.pageCount}` : startNumber}{suffix}
            <span className="text-gray-400 ml-1">（第 1 页）</span>
          </p>
          {activeFile.pageCount > 1 && (
            <p className="text-xs text-gray-400 mt-1">
              {prefix}{showTotalPages ? `${startNumber + 1} / ${activeFile.pageCount}` : startNumber + 1}{suffix}
              <span className="ml-1">（第 2 页）</span>
              {activeFile.pageCount > 2 && (
                <span className="ml-1">…{prefix}{showTotalPages ? `${startNumber + activeFile.pageCount - 1} / ${activeFile.pageCount}` : startNumber + activeFile.pageCount - 1}{suffix}（第 {activeFile.pageCount} 页）</span>
              )}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleAddNumbers}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading ? '处理中...' : '添加页码并下载'}
      </button>
    </div>
  )
}
