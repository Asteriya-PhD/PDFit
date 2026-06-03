import { useState, useCallback, useRef, useEffect } from 'react'
import { useI18n } from '@/i18n'
import { uploadAndExtract, loadConfig, saveConfig, hasConsent, saveConsent, getBuiltInApiKey } from '@/lib/mineru'
import { Upload, Download, Settings, AlertTriangle, X, AlertCircle, Globe, FileText } from 'lucide-react'

export default function MineruTool() {
  const { t } = useI18n()

  const builtInKey = getBuiltInApiKey()
  const [config, setConfig] = useState(() => builtInKey ? { endpoint: 'https://mineru.net', apiKey: builtInKey } : loadConfig())
  const [showConfig, setShowConfig] = useState(!config && !builtInKey)
  const [endpoint, setEndpoint] = useState(config?.endpoint || 'https://mineru.net')
  const [apiKey, setApiKey] = useState(config?.apiKey || builtInKey || '')
  const [consentGiven, setConsentGiven] = useState(hasConsent())

  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (builtInKey && config) {
      saveConfig(config.endpoint, config.apiKey)
    }
  }, [builtInKey, config])

  const handleSaveConfig = useCallback(() => {
    if (!endpoint.trim() || !apiKey.trim()) return
    saveConfig(endpoint.trim(), apiKey.trim())
    setConfig({ endpoint: endpoint.trim(), apiKey: apiKey.trim() })
    setShowConfig(false)
  }, [endpoint, apiKey])

  const handleAcceptPrivacy = useCallback(() => {
    saveConsent()
    setConsentGiven(true)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setStatus('idle')
      setResult('')
      setError('')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) {
      setFile(f)
      setStatus('idle')
      setResult('')
      setError('')
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!file || !config) return
    setStatus('uploading')
    setProgress('')
    setError('')
    try {
      const res = await uploadAndExtract(config.endpoint, config.apiKey, file, setProgress)
      setResult(res.markdown)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mineru.error.default'))
      setStatus('error')
    }
  }, [file, config, t])

  const handleDownload = useCallback(() => {
    if (!result) return
    const baseName = file?.name.replace(/\.[^.]+$/, '') || 'document'
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [result, file])

  // No consent yet → show privacy gate
  if (!consentGiven) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 space-y-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">{t('mineru.privacy.title')}</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                {t('mineru.privacy.description')}
              </p>
            </div>
          </div>

          <div
            className="rounded-lg border p-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {t('mineru.privacy.detail')}
            </p>
          </div>

          <label
            className="flex items-start gap-3 text-sm cursor-pointer p-3 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={handleAcceptPrivacy}
              className="mt-0.5"
            />
            <span>{t('mineru.privacy.consent')}</span>
          </label>

          <p className="text-xs text-amber-700 dark:text-amber-300">
            {t('mineru.privacy.notice')}
          </p>
        </div>
      </div>
    )
  }

  // Need API key config (fallback when env var not set)
  if (showConfig && !builtInKey) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <h3
            className="text-lg font-medium flex items-center gap-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Settings className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
            {t('mineru.config.title')}
          </h3>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium flex items-center gap-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Globe className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              {t('mineru.config.endpoint')}
            </label>
            <input
              type="url"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="https://mineru.net"
              className="input"
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium flex items-center gap-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('mineru.config.apiKey')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={t('mineru.config.apiKeyPlaceholder')}
              className="input"
            />
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={!endpoint.trim() || !apiKey.trim()}
            className="w-full px-4 py-2 btn-primary text-white rounded-md text-sm font-medium disabled:cursor-not-allowed"
          >
            {t('mineru.config.save')}
          </button>
        </div>
      </div>
    )
  }

  // Main upload UI
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {t('mineru.title')}
        </h3>
        {!builtInKey && (
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            <Settings className="w-3 h-3" />
            {t('mineru.configButton')}
          </button>
        )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 dark:text-amber-300">
          {t('mineru.privacy.banner')}
        </div>
      </div>

      {!file ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-100)] transition-colors"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('mineru.dropzone.text')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('mineru.dropzone.formats')}
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border p-4 space-y-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <FileText className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{file.name}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
            </div>
            {status !== 'uploading' && (
              <button
                onClick={() => { setFile(null); setStatus('idle'); setResult(''); setError('') }}
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {status === 'idle' && (
            <button
              onClick={handleProcess}
              className="w-full px-4 py-2 btn-primary text-white rounded-md text-sm font-medium transition-colors"
            >
              {t('mineru.button')}
            </button>
          )}

          {status === 'uploading' && (
            <div className="space-y-2">
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="h-full bg-[var(--color-accent)] rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>{progress}</p>
            </div>
          )}

          {status === 'done' && (
            <div className="space-y-3">
              <div
                className="max-h-80 overflow-y-auto rounded-md p-3 text-sm whitespace-pre-wrap font-mono"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
                tabIndex={0}
                role="region"
                aria-label={t('mineru.title')}
              >
                {result.slice(0, 5000)}
                {result.length > 5000 && <span style={{ color: 'var(--color-text-muted)' }}>...</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 btn-primary text-white rounded-md text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('mineru.download')}
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-sm text-[var(--color-accent-700)] bg-[var(--color-accent-100)] rounded-md p-3">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
