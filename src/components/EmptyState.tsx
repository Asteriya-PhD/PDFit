import { useCallback, useState, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { Shield, Upload } from 'lucide-react'
import StoragePersistBanner from '@/components/StoragePersistBanner'

interface IndexEntry {
  num: string
  key: string
  featured?: boolean
}

/**
 * Editorial "Privacy Press" landing for PDFit.
 * Single-viewport layout: hero + dropzone on top, numbered tool index below,
 * PRIVACY GUARANTEE bar at the bottom.
 *
 * The dropzone uses an explicit onClick → inputRef.current.click()
 * pattern (NOT <label htmlFor>) because label-synthesized file-picker
 * clicks are unreliable in installed-PWA contexts (iOS PWA + some
 * Chromium PWAs swallow them). The same pattern is used in
 * FileDropzone.tsx and ImageToPdfTool.tsx, both of which work in
 * installed PWAs.
 */
export default function EmptyState() {
  const { addFiles } = useApp()
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const fileList = Array.from(e.dataTransfer.files).filter(
        f => f.type === 'application/pdf'
      )
      if (fileList.length > 0) addFiles(fileList)
    },
    [addFiles]
  )
  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }, [])
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files))
      e.target.value = ''
    },
    [addFiles]
  )

  const convertTools: IndexEntry[] = [
    { num: '01', key: 'pdfToDocx', featured: true },
    { num: '02', key: 'pdfToXlsx', featured: true },
    { num: '03', key: 'pdfImage' },
  ]
  const editTools: IndexEntry[] = [
    { num: '05', key: 'merge' },
    { num: '06', key: 'split' },
    { num: '07', key: 'delete' },
    { num: '08', key: 'reorder' },
    { num: '09', key: 'rotate' },
  ]
  const annotateTools: IndexEntry[] = [
    { num: '10', key: 'pageNumbering' },
    { num: '11', key: 'watermark' },
  ]
  const extractTools: IndexEntry[] = [
    { num: '12', key: 'pdfToMd' },
  ]

  return (
    <div
      className="flex-1 flex flex-col min-h-0 animate-fadeIn editorial-grain"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      {/* Top hairline */}
      <div
        className="shrink-0"
        style={{ height: '4px', backgroundColor: 'var(--color-accent)' }}
      />

      <div className="flex-1 flex flex-col px-4 md:px-10 lg:px-14 py-3 md:py-4 min-h-0">
        {/* HERO + DROPZONE */}
        <section className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-center pb-3">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <div className="kicker flex items-center gap-3 mb-3">
              <span>{t('emptyState.kicker')}</span>
              <span
                className="flex-1 max-w-[200px] hidden sm:block"
                style={{ height: '1px', backgroundColor: 'var(--color-rule)' }}
              />
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 500,
                fontSize: 'clamp(48px, 7vw, 96px)',
                lineHeight: 0.95,
                letterSpacing: '-0.035em',
                color: 'var(--color-ink)',
              }}
            >
              {t('emptyState.headline1')}
              <br />
              {t('emptyState.headline2').split('.')[0]}
              <span style={{ color: 'var(--color-accent)', fontStyle: 'italic', fontWeight: 400 }}>
                .
              </span>
            </h1>
            <p
              className="mt-3 max-w-[460px]"
              style={{ fontSize: '16px', lineHeight: 1.5, color: 'var(--color-muted)' }}
            >
              {t('emptyState.subhead')}
            </p>
            <div
              className="mt-3 flex items-center gap-2"
              style={{ fontSize: '13px', color: 'var(--color-muted)' }}
            >
              <Shield className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span>{t('emptyState.privacyLine')}</span>
            </div>
          </div>

          {/* Right: dropzone */}
          <div className="w-full lg:w-[440px] shrink-0">
            <div
              role="button"
              tabIndex={0}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              aria-label={t('emptyState.dropzone.text')}
              className="cursor-pointer transition-all duration-300"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: `1.5px dashed ${isDragging ? 'var(--color-accent)' : 'var(--color-rule)'}`,
                borderRadius: '14px',
                padding: '24px 28px',
                cursor: 'pointer',
                boxShadow: isDragging
                  ? '0 0 0 4px var(--color-accent-100), 0 8px 24px rgba(20, 20, 19, 0.08)'
                  : '0 2px 12px rgba(20, 20, 19, 0.04)',
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-3"
                  style={{
                    width: '78px',
                    height: '96px',
                    border: '1.5px dashed var(--color-rule)',
                    borderRadius: '7px',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: 'var(--color-accent-700)',
                    position: 'relative',
                  }}
                >
                  PDF
                </div>
                <p
                  className="mb-1"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    fontSize: '22px',
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t('emptyState.dropzone.text')}
                </p>
                <p className="mb-4" style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
                  {t('emptyState.dropzone.hint')}
                </p>
                <span
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full"
                  style={{
                    // Mid-tone orange between brand accent (#d97757,
                    // 3.08:1 fails AA) and accent-700 (#8b3a1c, 8.97:1
                    // but reads as muddy brown). #b8553a = 4.75:1,
                    // passes AA on white text and still looks orange.
                    // Kept inline rather than adding a new CSS var for
                    // one-off use; the brand identity is preserved by
                    // the surrounding accent-100/700 text + the
                    // hairline orange strip at the top of the page.
                    backgroundColor: '#b8553a',
                    color: '#fff',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    fontSize: '14px',
                    letterSpacing: '0.01em',
                  }}
                >
                  <Upload className="w-4 h-4" />
                  {t('emptyState.browseButton')}
                </span>
              </div>
            </div>
            {/* Hidden file input — sibling of the role=button div, not a
                descendant, to satisfy a11y "no interactive nested in
                interactive". tabIndex=-1 keeps it out of the tab order;
                the div above is the focusable / clickable target. */}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              aria-label={t('emptyState.dropzone.text')}
              tabIndex={-1}
              className="sr-only"
            />
          </div>
        </section>

        {/* Section break */}
        <hr
          className="shrink-0"
          style={{ border: 0, height: '1px', backgroundColor: 'var(--color-ink)', margin: '4px 0 10px' }}
        />

        {/* TOOL INDEX */}
        <section className="editorial-grid flex-1">
          <IndexColumn label={t('emptyState.section.convert')} entries={convertTools} t={t} />
          <IndexColumn label={t('emptyState.section.edit')} entries={editTools} t={t} />
          <IndexColumn label={t('emptyState.section.annotate')} entries={annotateTools} t={t} />
          <IndexColumn label={t('emptyState.section.extract')} entries={extractTools} t={t} />
        </section>

        {/* PRIVACY GUARANTEE BAR */}
        <StoragePersistBanner />
        <div className="privacy-bar mt-2.5">
          <span className="privacy-bar-title">{t('emptyState.privacyGuarantee.title')}</span>
          <span className="privacy-bar-body">{t('emptyState.privacyGuarantee.body')}</span>
        </div>
      </div>
    </div>
  )
}

interface IndexColumnProps {
  label: string
  entries: IndexEntry[]
  t: (key: string) => string
}

function IndexColumn({ label, entries, t }: IndexColumnProps) {
  return (
    <div className="min-w-0">
      <h2 className="section-label">
        <span className="mark">§</span>
        {label}
      </h2>
      {entries.map(entry => (
        <div
          key={entry.key}
          className="tool-row"
          data-tip={t(`emptyState.tool.${entry.key}`)}
        >
          <span className="tool-number">{entry.num}</span>
          <span className="tool-name">
            {t(`header.tool.${entry.key}`)}
          </span>
          {entry.featured && <span className="badge-new">{t('emptyState.badge.new')}</span>}
        </div>
      ))}
    </div>
  )
}
