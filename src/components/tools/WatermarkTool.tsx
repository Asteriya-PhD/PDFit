import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { addWatermark } from '@/lib/watermark'
import { triggerDownload } from '@/lib/download'
import { Download } from 'lucide-react'

const FONT_SIZES = [24, 36, 48, 60, 72, 96, 120]
const ROTATIONS = [
  { value: -45, label: '-45°（斜向）' },
  { value: 0, label: '0°（水平）' },
  { value: 45, label: '45°（斜向）' },
  { value: 90, label: '90°（纵向）' },
]
const COLOR_PRESETS = ['#cccccc', '#999999', '#666666', '#333333', '#e53e3e', '#3182ce']

export default function WatermarkTool() {
  const { files, activeFileId, setLoading, loading } = useApp()
  const activeFile = files.find(f => f.id === activeFileId)

  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(60)
  const [opacity, setOpacity] = useState(0.2)
  const [rotation, setRotation] = useState(-45)
  const [color, setColor] = useState('#cccccc')
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all')
  const [customPages, setCustomPages] = useState('')

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-gray-400 text-sm py-12">
        请先选择一个 PDF 文件
      </div>
    )
  }

  const handleApply = async () => {
    if (!text.trim()) {
      alert('请输入水印文字')
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
      alert('添加水印失败: ' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加水印</h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        当前文件: <span className="font-medium text-gray-700 dark:text-gray-200">{activeFile.name}</span>
        <span className="text-gray-400 ml-2">({activeFile.pageCount} 页)</span>
      </p>

      <div className="space-y-5 mb-6">
        {/* Watermark Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">水印文字</label>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="请输入水印文字，如: CONFIDENTIAL"
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">字号</label>
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
            透明度: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={e => setOpacity(parseInt(e.target.value, 10) / 100)}
            className="w-full accent-red-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>淡</span>
            <span>浓</span>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">旋转角度</label>
          <div className="grid grid-cols-4 gap-2">
            {ROTATIONS.map(r => (
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

        {/* Page Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">应用范围</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setPageScope('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pageScope === 'all'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              全部页面
            </button>
            <button
              onClick={() => setPageScope('custom')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pageScope === 'custom'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              指定页面
            </button>
          </div>
          {pageScope === 'custom' && (
            <input
              type="text"
              value={customPages}
              onChange={e => setCustomPages(e.target.value)}
              placeholder="如: 1,3,5-7（共 {activeFile.pageCount} 页）"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          )}
        </div>

        {/* Preview */}
        {text.trim() && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-1">预览效果</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
              {text.trim()}
              <span className="text-gray-400 ml-1">
                · {fontSize}pt · {Math.round(opacity * 100)}% · {rotation}°
                {pageScope === 'all'
                  ? ` · ${activeFile.pageCount} 页`
                  : ` · 指定页面`}
              </span>
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleApply}
        disabled={loading || !text.trim()}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading ? '处理中...' : '添加水印并下载'}
      </button>
    </div>
  )
}
