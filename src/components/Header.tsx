import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import type { ToolType } from '@/types'
import { Combine, Split, Trash2, RotateCw, Move, FileText, Image, FileImage, Hash, Droplets, FileSpreadsheet } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import LocaleToggle from '@/components/LocaleToggle'

export default function Header() {
  const { files, activeTool, setTool } = useApp()
  const { t } = useI18n()

  const tools: { type: ToolType; label: string; icon: typeof Combine; description: string }[] = [
    { type: 'merge', label: t('header.tool.merge'), icon: Combine, description: t('header.tool.description.merge') },
    { type: 'split', label: t('header.tool.split'), icon: Split, description: t('header.tool.description.split') },
    { type: 'delete', label: t('header.tool.delete'), icon: Trash2, description: t('header.tool.description.delete') },
    { type: 'rotate', label: t('header.tool.rotate'), icon: RotateCw, description: t('header.tool.description.rotate') },
    { type: 'reorder', label: t('header.tool.reorder'), icon: Move, description: t('header.tool.description.reorder') },
    { type: 'page-numbering', label: t('header.tool.pageNumbering'), icon: Hash, description: t('header.tool.description.pageNumbering') },
    { type: 'watermark', label: t('header.tool.watermark'), icon: Droplets, description: t('header.tool.description.watermark') },
    { type: 'pdf-to-image', label: t('header.tool.pdfToImage'), icon: Image, description: t('header.tool.description.pdfToImage') },
    { type: 'image-to-pdf', label: t('header.tool.imageToPdf'), icon: FileImage, description: t('header.tool.description.imageToPdf') },
    { type: 'pdf-to-md', label: t('header.tool.pdfToMd'), icon: FileText, description: t('header.tool.description.pdfToMd') },
    { type: 'mineru', label: t('header.tool.mineru'), icon: FileSpreadsheet, description: t('header.tool.description.mineru') },
  ]

  return (
    <header
      className="shrink-0 border-b"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center h-16 px-6 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span
            className="text-lg tracking-tight"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {t('header.title')}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* Tool Navigation */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {tools.map(tool => {
            const Icon = tool.icon
            const isActive = activeTool === tool.type
            return (
              <button
                key={tool.type}
                onClick={() => setTool(isActive ? null : tool.type)}
                className="tool-item whitespace-nowrap"
                data-tooltip={tool.description}
                style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'var(--color-surface-active)' : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{tool.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
