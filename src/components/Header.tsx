import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import type { ToolType } from '@/types'
import { Combine, Split, Trash2, RotateCw, Move, FileText, FileType, Sheet, Hash, Droplets, ImageDown } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import LocaleToggle from '@/components/LocaleToggle'
import InstallButton from '@/components/InstallButton'

export default function Header() {
  const { activeTool, setTool } = useApp()
  const { t } = useI18n()

  const toolGroups = [
    {
      label: t('header.group.convert'),
      tools: [
        { type: 'pdf-to-docx' as ToolType, label: t('header.tool.pdfToDocx'), icon: FileType, description: t('header.tool.description.pdfToDocx'), featured: true },
        { type: 'pdf-to-xlsx' as ToolType, label: t('header.tool.pdfToXlsx'), icon: Sheet, description: t('header.tool.description.pdfToXlsx'), featured: true },
        { type: 'pdf-image' as ToolType, label: t('header.tool.pdfImage'), icon: ImageDown, description: t('header.tool.description.pdfImage') },
      ],
    },
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
        backgroundColor: 'var(--color-paper)',
        borderColor: 'var(--color-rule)',
      }}
    >
      <div className="flex items-center h-14 px-4 md:px-6 gap-3 md:gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{
              border: '1.5px solid var(--color-ink)',
            }}
          >
            <FileText className="w-4 h-4" style={{ color: 'var(--color-ink)' }} />
          </div>
          <span
            className="text-base md:text-lg"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
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
                    backgroundColor: 'var(--color-rule)',
                  }}
                />
              )}
              {group.tools.map((tool, toolIdx) => {
                const Icon = tool.icon
                const isActive = activeTool === tool.type
                const isFeatured = 'featured' in tool && tool.featured === true
                // Add 6px gap between adjacent featured buttons so highlight blocks don't touch
                const prevTool = toolIdx > 0 ? group.tools[toolIdx - 1] : null
                const prevFeatured = prevTool && 'featured' in prevTool && prevTool.featured === true
                const gapBefore = isFeatured && prevFeatured ? '6px' : undefined
                return (
                  <button
                    key={tool.type}
                    onClick={() => setTool(isActive ? null : tool.type)}
                    className="whitespace-nowrap flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-md text-xs md:text-sm font-medium transition-all duration-300 shrink-0"
                    data-tooltip={tool.description}
                    aria-label={isFeatured ? `${tool.label} — ${t('header.featuredLabel')}` : tool.description}
                    style={{
                      color: isActive || isFeatured
                        ? 'var(--color-accent-700)'
                        : 'var(--color-text-secondary)',
                      backgroundColor: isActive
                        ? 'var(--color-surface-active)'
                        : isFeatured
                          ? 'var(--color-accent-100)'
                          : 'transparent',
                      fontFamily: 'var(--font-body)',
                      fontWeight: isFeatured ? 600 : 500,
                      marginLeft: gapBefore,
                      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={e => {
                      if (!isActive && !isFeatured) {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-active)'
                        e.currentTarget.style.color = 'var(--color-accent)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive && !isFeatured) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-secondary)'
                      } else if (isFeatured && !isActive) {
                        // keep featured treatment on mouseout
                        e.currentTarget.style.backgroundColor = 'var(--color-accent-100)'
                        e.currentTarget.style.color = 'var(--color-accent-700)'
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
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <span
            className="hidden md:inline text-[10px] tracking-[0.18em] uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-muted)',
            }}
          >
            Vol. 01
          </span>
          <InstallButton />
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
