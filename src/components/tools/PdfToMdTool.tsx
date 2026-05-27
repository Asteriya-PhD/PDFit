import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { pdfToMarkdown } from '@/lib/pdfToMarkdown'
import { Download, Copy, Check, FileText } from 'lucide-react'

export default function PdfToMdTool() {
  const { files, activeFileId } = useApp()
  const activeFile = files.find(f => f.id === activeFileId)

  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [isEmpty, setIsEmpty] = useState(false)

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-gray-400 text-sm py-12">
        请先选择一个 PDF 文件
      </div>
    )
  }

  const handleExtract = async () => {
    setLoading(true)
    setMarkdown('')
    setIsEmpty(false)
    setProgress({ done: 0, total: 0 })

    try {
      const result = await pdfToMarkdown(
        activeFile.arrayBuffer,
        (done, total) => setProgress({ done, total })
      )

      if (!result.markdown || result.markdown.length < 10) {
        setIsEmpty(true)
      } else {
        setMarkdown(result.markdown)
      }
    } catch (err) {
      alert('提取失败: ' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setLoading(false)
      setProgress({ done: 0, total: 0 })
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = markdown
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.name.replace(/\.pdf$/i, '') + '.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const showResult = markdown.length > 0 || isEmpty

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">提取 Markdown</h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        当前文件: <span className="font-medium text-gray-700 dark:text-gray-200">{activeFile.name}</span>
        <span className="text-gray-400 ml-2">({activeFile.pageCount} 页)</span>
      </p>

      {!showResult && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            将 PDF 中的文本内容提取为 Markdown 格式。支持标题检测和段落分割。
          </p>
          <p className="text-xs text-gray-400">
            注意：扫描件（图片型 PDF）无法提取文本。表格和复杂排版可能无法完美还原。
          </p>

          {loading && progress.total > 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>处理中 {progress.done}/{progress.total} 页</span>
                <span>{Math.round((progress.done / progress.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-200"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleExtract}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="w-4 h-4" />
            {loading ? '提取中...' : '提取 Markdown'}
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">此 PDF 可能为扫描件，无可提取的文本</p>
          <p className="text-gray-400 text-xs">
            建议使用 OCR 工具（如 Adobe Acrobat、ABBYY）先进行文字识别
          </p>
        </div>
      )}

      {markdown.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700
                text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600
                text-white hover:bg-red-700 transition-colors"
            >
              <Download className="w-4 h-4" /> 下载 .md
            </button>
            <button
              onClick={() => { setMarkdown(''); setIsEmpty(false) }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700
                text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              重新提取
            </button>
          </div>

          <textarea
            readOnly
            value={markdown}
            className="w-full h-80 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-700 dark:text-gray-200
              bg-gray-50 dark:bg-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          <p className="text-xs text-gray-400 text-right">
            共 {markdown.length} 字符 · {markdown.split('\n').length} 行
          </p>
        </div>
      )}
    </div>
  )
}
