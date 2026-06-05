import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { FileText, FileImage, ArrowRight } from 'lucide-react'

/**
 * "PDF ↔ Image" — a 2-card chooser that lets the user pick a direction.
 * Clicking a card hands off to the underlying specific tool via setTool().
 * Renders only when no file is loaded; with a file loaded, the chooser
 * goes straight to the most relevant direction (PDF → Image) so the
 * existing per-tool flow is unchanged.
 */
export default function PdfImageTool() {
  const { setTool, getActiveFile } = useApp()
  const { t } = useI18n()
  const activeFile = getActiveFile() ?? null

  return <PdfImageChooser onPick={direction => setTool(direction)} activeFile={activeFile} t={t} />
}

interface ChooserProps {
  onPick: (direction: 'pdf-to-image' | 'image-to-pdf') => void
  activeFile: { id: string; name: string } | null
  t: (key: string) => string
}

function PdfImageChooser({ onPick, activeFile, t }: ChooserProps) {
  return (
    <div className="animate-fadeIn">
      <header className="mb-6">
        <h2
          className="text-2xl mb-1"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}
        >
          {t('header.tool.pdfImage')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('header.tool.description.pdfImage')}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DirectionCard
          icon={<FileText className="w-6 h-6" />}
          arrowIcon={<ArrowRight className="w-5 h-5" />}
          title={t('header.tool.pdfToImage')}
          subtitle={t('header.tool.description.pdfToImage')}
          onClick={() => onPick('pdf-to-image')}
        />
        <DirectionCard
          icon={<FileImage className="w-6 h-6" />}
          arrowIcon={<ArrowRight className="w-5 h-5" />}
          title={t('header.tool.imageToPdf')}
          subtitle={t('header.tool.description.imageToPdf')}
          onClick={() => onPick('image-to-pdf')}
        />
      </div>

      {activeFile && (
        <p className="mt-4 text-xs" style={{ color: 'var(--color-muted)' }}>
          {activeFile.name}
        </p>
      )}
    </div>
  )
}

interface CardProps {
  icon: React.ReactNode
  arrowIcon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
}

function DirectionCard({ icon, arrowIcon, title, subtitle, onClick }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-5 rounded-lg transition-all duration-200 flex items-start gap-4 group"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-accent)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface-active)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface)'
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--color-accent-100)', color: 'var(--color-accent-700)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-base font-semibold mb-1 flex items-center gap-2"
          style={{ color: 'var(--color-ink)' }}
        >
          {title}
          <span style={{ color: 'var(--color-muted)' }}>{arrowIcon}</span>
        </div>
        <p className="text-sm leading-snug" style={{ color: 'var(--color-muted)' }}>
          {subtitle}
        </p>
      </div>
    </button>
  )
}
