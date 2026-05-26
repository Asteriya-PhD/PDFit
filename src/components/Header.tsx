import { useApp } from '@/contexts/AppContext'
import type { ToolType } from '@/types'
import { Combine, Split, Trash2, RotateCw, FileText, Image, FileImage } from 'lucide-react'

const tools: { type: ToolType; label: string; icon: typeof Combine }[] = [
  { type: 'merge', label: '合并', icon: Combine },
  { type: 'split', label: '分割', icon: Split },
  { type: 'delete', label: '删除页面', icon: Trash2 },
  { type: 'rotate', label: '旋转', icon: RotateCw },
  { type: 'pdf-to-image', label: 'PDF转图片', icon: Image },
  { type: 'image-to-pdf', label: '图片转PDF', icon: FileImage },
  { type: 'pdf-to-md', label: '提取Markdown', icon: FileText },
]

export default function Header() {
  const { files, activeTool, setTool } = useApp()

  return (
    <header className="border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center h-14 px-4 gap-4">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-800">PdfX</span>
        </div>

        <nav className="flex items-center gap-1">
          {tools.map(tool => {
            const Icon = tool.icon
            const isActive = activeTool === tool.type
            const needsPdf = tool.type !== 'image-to-pdf'
            const disabled = files.length === 0 && needsPdf
            return (
              <button
                key={tool.type}
                onClick={() => setTool(isActive ? null : tool.type)}
                disabled={disabled}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tool.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
