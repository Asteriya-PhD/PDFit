import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import type { ToolType } from '@/types'
import { Combine, Split, Trash2, RotateCw, Move, FileText, Image, FileImage, Hash, Droplets, FileSpreadsheet } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import LocaleToggle from '@/components/LocaleToggle'

export default function Header() {
  const { files, activeTool, setTool } = useApp()
  const { t } = useI18n()

  const tools: { type: ToolType; label: string; icon: typeof Combine }[] = [
    { type: 'merge', label: t('header.tool.merge'), icon: Combine },
    { type: 'split', label: t('header.tool.split'), icon: Split },
    { type: 'delete', label: t('header.tool.delete'), icon: Trash2 },
    { type: 'rotate', label: t('header.tool.rotate'), icon: RotateCw },
    { type: 'reorder', label: t('header.tool.reorder'), icon: Move },
    { type: 'page-numbering', label: t('header.tool.pageNumbering'), icon: Hash },
    { type: 'watermark', label: t('header.tool.watermark'), icon: Droplets },
    { type: 'pdf-to-image', label: t('header.tool.pdfToImage'), icon: Image },
    { type: 'image-to-pdf', label: t('header.tool.imageToPdf'), icon: FileImage },
    { type: 'pdf-to-md', label: t('header.tool.pdfToMd'), icon: FileText },
    { type: 'mineru', label: t('header.tool.mineru'), icon: FileSpreadsheet },
  ]

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
      <div className="flex items-center h-14 px-4 gap-4">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{t('header.title')}</span>
        </div>

        <nav className="flex items-center gap-1">
          {tools.map(tool => {
            const Icon = tool.icon
            const isActive = activeTool === tool.type
            const disabled = tool.type !== 'image-to-pdf' && files.length === 0
            return (
              <button
                key={tool.type}
                onClick={() => setTool(isActive ? null : tool.type)}
                disabled={disabled}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-red-50 dark:bg-blue-900/30 text-red-700 dark:text-blue-400 border border-red-200 dark:border-blue-800'
                    : disabled
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tool.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-1 ml-auto">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
