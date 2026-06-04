import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import type { ToolType } from '@/types'
import { Combine, Split, Trash2, RotateCw, Move, FileText, Image, FileImage, Hash, Droplets } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import LocaleToggle from '@/components/LocaleToggle'

export default function Header() {
  const { files, activeTool, setTool } = useApp()
  const { t } = useI18n()

  const toolGroups = [
    {
      label: t('header.group.edit'),
      tools: [
        { type: 'merge' as ToolType, label: t('header.tool.merge'), icon: Combine, description: t('header.tool.description.merge') },
        { type: 'split' as ToolType, label: t('header.tool.split'), icon: Split, description: t('header.tool.description.split') },
        { type: 'delete' as ToolType, label: t('header.tool.delete'), icon: Trash2, description: t('header.tool.description.delete') },
        { type: 'reorder' as ToolType, label: t('header.tool.reorder'), icon: Move, description: t('header.tool.description.reorder') },
        { type: 'rotate' as ToolType, label: t('header.tool.rotate'), icon: RotateCw, description: t('header.tool.description.rotate') },
      ],
    },
    {
      label: t('header.group.annotate'),
      tools: [
        { type: 'page-numbering' as ToolType, label: t('header.tool.pageNumbering'), icon: Hash, description: t('header.tool.description.pageNumbering') },
        { type: 'watermark' as ToolType, label: t('header.tool.watermark'), icon: Droplets, description: t('header.tool.description.watermark') },
      ],
    },
    {
      label: t('header.group.convert'),
      tools: [
        { type: 'pdf-to-image' as ToolType, label: t('header.tool.pdfToImage'), icon: Image, description: t('header.tool.description.pdfToImage') },
        { type: 'image-to-pdf' as ToolType, label: t('header.tool.imageToPdf'), icon: FileImage, description: t('header.tool.description.imageToPdf') },
      ],
    },
    {
      label: t('header.group.extract'),
      tools: [
        { type: 'pdf-to-md' as ToolType, label: t('header.tool.pdfToMd'), icon: FileText, description: t('header.tool.description.pdfToMd') },
      ],
    },
  ]

  return (
    <header
      className="shrink-0 border-b"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center h-14 px-4 md:px-6 gap-3 md:gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-base md:text-lg tracking-tighter"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            {t('header.title')}
          </span>
        </div>

        {/* Tool Navigation */}
        <nav
          className="flex items-center gap-0.5 md:gap-1 flex-1 overflow-x-auto scrollbar-thin"
          style={{ WebkitOverflowScrolling: 'touch' }}
          tabIndex={0}
          aria-label={t('header.title')}
        >
          {toolGroups.map((group, groupIndex) => (
            <div key={group.label} className="flex items-center">
              {groupIndex > 0 && (
                <div
                  className="mx-1.5 md:mx-2 shrink-0"
                  style={{
                    width: '1px',
                    height: '20px',
                    backgroundColor: 'var(--color-border)',
                    opacity: 0.6,
                  }}
                />
              )}
              {group.tools.map(tool => {
                const Icon = tool.icon
                const isActive = activeTool === tool.type
                return (
                  <button
                    key={tool.type}
                    onClick={() => setTool(isActive ? null : tool.type)}
                    className="whitespace-nowrap flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 shrink-0"
                    data-tooltip={tool.description}
                    style={{
                      color: isActive ? 'var(--color-accent-700)' : 'var(--color-text-secondary)',
                      backgroundColor: isActive ? 'var(--color-surface-active)' : 'transparent',
                      fontFamily: 'var(--font-heading)',
                      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-active)'
                        e.currentTarget.style.color = 'var(--color-accent)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-secondary)'
                      }
                    }}
                  >
                    <Icon className="w-3.5 md:w-4 h-3.5 md:h-4 shrink-0" />
                    <span className="hidden sm:inline">{tool.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
