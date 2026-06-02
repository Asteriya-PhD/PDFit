import { useState, useMemo } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { pdfToMarkdown } from '@/lib/pdfToMarkdown'
import { Download, Copy, Check, FileText } from 'lucide-react'

type OutputMode = 'markdown' | 'plaintext'

export default function PdfToMdTool() {
  const { files, activeFileId } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === activeFileId)

  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [isEmpty, setIsEmpty] = useState(false)
  const [outputMode, setOutputMode] = useState<OutputMode>('markdown')

  if (!activeFile) {
    return (
      <div className="max-w-lg mx-auto text-center text-sm py-12" style={{ color: 'var(--color-text-muted)' }}>
        {t('pdfToMd.noFile')}
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
      alert(t('pdfToMd.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
      setProgress({ done: 0, total: 0 })
    }
  }

  const displayText = useMemo(() => {
    if (!markdown) return ''
    if (outputMode === 'markdown') return markdown
    return stripMarkdown(markdown)
  }, [markdown, outputMode])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = displayText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (outputMode === 'markdown') {
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = activeFile.name.replace(/\.pdf$/i, '') + '.md'
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const plainText = stripMarkdown(markdown)
      const blob = new Blob([plainText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = activeFile.name.replace(/\.pdf$/i, '') + '.txt'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleReset = () => {
    setMarkdown('')
    setIsEmpty(false)
  }

  const showResult = markdown.length > 0 || isEmpty

  const tabBase = 'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border'

  return (
    <div className="max-w-2xl mx-auto">
      <h2
        className="text-lg font-semibold mb-4"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text-primary)',
        }}
      >
        {t('pdfToMd.title')}
      </h2>

      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        {t('pdfToMd.currentFile')}
        <span className="font-medium ml-1" style={{ color: 'var(--color-text-primary)' }}>{activeFile.name}</span>
        <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>{t('pdfToMd.pageCount', { count: activeFile.pageCount })}</span>
      </p>

      {!showResult && (
        <div className="space-y-4">
          {/* Output format toggle */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-text-secondary)',
              }}
            >
              输出格式
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOutputMode('markdown')}
                className={tabBase}
                style={
                  outputMode === 'markdown'
                    ? {
                        backgroundColor: 'var(--color-accent-100)',
                        color: 'var(--color-accent)',
                        borderColor: 'var(--color-accent)',
                      }
                    : {
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-secondary)',
                        borderColor: 'var(--color-border)',
                      }
                }
              >
                Markdown
              </button>
              <button
                onClick={() => setOutputMode('plaintext')}
                className={tabBase}
                style={
                  outputMode === 'plaintext'
                    ? {
                        backgroundColor: 'var(--color-accent-100)',
                        color: 'var(--color-accent)',
                        borderColor: 'var(--color-accent)',
                      }
                    : {
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-secondary)',
                        borderColor: 'var(--color-border)',
                      }
                }
              >
                纯文本
              </button>
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('pdfToMd.description')}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('pdfToMd.limitation')}
          </p>

          {loading && progress.total > 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>{t('pdfToMd.progress', { done: progress.done, total: progress.total })}</span>
                <span>{Math.round((progress.done / progress.total) * 100)}%</span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleExtract}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 btn-primary"
          >
            <FileText className="w-4 h-4" />
            {loading ? t('pdfToMd.loading') : t('pdfToMd.button')}
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="text-center py-8">
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('pdfToMd.empty.title')}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('pdfToMd.empty.hint')}
          </p>
        </div>
      )}

      {markdown.length > 0 && (
        <div className="space-y-3">
          {/* Output format toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setOutputMode('markdown')}
                className={tabBase}
                style={
                  outputMode === 'markdown'
                    ? {
                        backgroundColor: 'var(--color-accent-100)',
                        color: 'var(--color-accent)',
                        borderColor: 'var(--color-accent)',
                      }
                    : {
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-secondary)',
                        borderColor: 'var(--color-border)',
                      }
                }
              >
                Markdown
              </button>
              <button
                onClick={() => setOutputMode('plaintext')}
                className={tabBase}
                style={
                  outputMode === 'plaintext'
                    ? {
                        backgroundColor: 'var(--color-accent-100)',
                        color: 'var(--color-accent)',
                        borderColor: 'var(--color-accent)',
                      }
                    : {
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-secondary)',
                        borderColor: 'var(--color-border)',
                      }
                }
              >
                纯文本
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('pdfToMd.stats', { count: displayText.length, lines: displayText.split('\n').length })}
            </p>
          </div>

          <textarea
            readOnly
            value={displayText}
            className="input font-mono resize-y"
            style={{
              height: '320px',
              lineHeight: '1.6',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {copied ? <Check className="w-4 h-4" style={{ color: 'var(--color-green)' }} /> : <Copy className="w-4 h-4" />}
              {copied ? t('pdfToMd.copied') : t('pdfToMd.copy')}
            </button>
            <button
              onClick={handleDownload}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <Download className="w-4 h-4" />
              {outputMode === 'markdown' ? t('pdfToMd.downloadMd') : t('pdfToMd.downloadTxt')}
            </button>
            <button
              onClick={handleReset}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {t('pdfToMd.reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function stripMarkdown(md: string): string {
  return md
    .replace(/<!--.*?-->/gs, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\*{1,2}(.*?)\*{1,2}/g, '$1')
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
