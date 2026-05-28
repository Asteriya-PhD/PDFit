import { useCallback, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { Upload, FileText, Combine, Split, Trash2, RotateCw, Hash, Image, FileImage, Droplets, Move, FileSpreadsheet, ArrowRight } from 'lucide-react'

export default function EmptyState() {
  const { addFiles } = useApp()
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const fileList = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    if (fileList.length > 0) addFiles(fileList)
  }, [addFiles])

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.multiple = true
    input.onchange = async () => {
      if (input.files) addFiles(Array.from(input.files))
    }
    input.click()
  }, [addFiles])

  const features = [
    { icon: Combine, label: t('emptyState.feature.merge'), color: 'var(--color-orange)' },
    { icon: Split, label: t('emptyState.feature.split'), color: 'var(--color-blue)' },
    { icon: Trash2, label: t('emptyState.feature.delete'), color: '#e57373' },
    { icon: RotateCw, label: t('emptyState.feature.rotate'), color: 'var(--color-green)' },
    { icon: Move, label: t('emptyState.feature.reorder'), color: '#9575cd' },
    { icon: Hash, label: t('emptyState.feature.pageNumbering'), color: '#4fc3f7' },
    { icon: Droplets, label: t('emptyState.feature.watermark'), color: 'var(--color-blue)' },
    { icon: Image, label: t('emptyState.feature.pdfToImage'), color: 'var(--color-orange)' },
    { icon: FileImage, label: t('emptyState.feature.imageToPdf'), color: 'var(--color-green)' },
    { icon: FileText, label: t('emptyState.feature.pdfToMd'), color: '#9575cd' },
    { icon: FileSpreadsheet, label: t('emptyState.feature.mineru'), color: '#4fc3f7' },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      {/* Hero Section */}
      <div className="text-center mb-10 animate-slideUp">
        <h1
          className="text-4xl mb-3"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.03em',
          }}
        >
          {t('header.title')}
        </h1>
        <p
          className="text-lg max-w-md mx-auto"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          PDF tools that run entirely in your browser. No uploads, no servers, complete privacy.
        </p>
      </div>

      {/* Main Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className="dropzone w-full max-w-xl cursor-pointer animate-scaleIn"
        style={{
          borderColor: isDragging ? 'var(--color-accent)' : undefined,
          backgroundColor: isDragging ? 'var(--color-surface-active)' : undefined,
        }}
      >
        {/* Upload Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2"
          style={{
            backgroundColor: 'rgba(217, 119, 87, 0.1)',
          }}
        >
          <Upload
            className="w-10 h-10"
            style={{ color: 'var(--color-accent)' }}
          />
        </div>

        {/* Text */}
        <div className="text-center">
          <p
            className="text-xl mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {t('emptyState.dropzone.text')}
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('emptyState.dropzone.hint')}
          </p>
        </div>

        {/* Browse Button */}
        <div
          className="mt-4 px-6 py-2.5 rounded-full text-sm font-medium"
          style={{
            fontFamily: 'var(--font-heading)',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
          }}
        >
          Browse Files
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-12 w-full max-w-3xl animate-slideUp" style={{ animationDelay: '100ms' }}>
        <p
          className="text-center text-sm mb-4"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Everything you need
        </p>
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
          {features.map(({ icon: Icon, label, color }, index) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl animate-slideUp"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                animationDelay: `${index * 30}ms`,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span
                className="text-xs text-center"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Note */}
      <div
        className="mt-8 flex items-center gap-2 text-sm animate-slideUp"
        style={{
          color: 'var(--color-text-muted)',
          animationDelay: '400ms',
        }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>100% private — files never leave your browser</span>
      </div>
    </div>
  )
}
