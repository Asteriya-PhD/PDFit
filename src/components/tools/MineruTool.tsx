import { useState, useCallback, useRef } from 'react'
import { useI18n } from '@/i18n'
import { uploadAndExtract, loadConfig, saveConfig } from '@/lib/mineru'
import { Upload, Download, Settings, AlertTriangle, X, AlertCircle, Globe, Key, FileText } from 'lucide-react'

export default function MineruTool() {
  const { t } = useI18n()

  const [config, setConfig] = useState(() => loadConfig())
  const [showConfig, setShowConfig] = useState(!config)
  const [endpoint, setEndpoint] = useState(config?.endpoint || 'https://mineru.net')
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSaveConfig = useCallback(() => {
    if (!endpoint.trim() || !apiKey.trim()) return
    saveConfig(endpoint.trim(), apiKey.trim())
    setConfig({ endpoint: endpoint.trim(), apiKey: apiKey.trim() })
    setShowConfig(false)
  }, [endpoint, apiKey])

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

  if (!config || showConfig) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-medium">{t('mineru.privacy.title')}</p>
            <p>{t('mineru.privacy.description')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            {t('mineru.config.title')}
          </h3>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-gray-400" />
              {t('mineru.config.endpoint')}
            </label>
            <input
              type="url"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="https://mineru.net"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-gray-400" />
              {t('mineru.config.apiKey')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={t('mineru.config.apiKeyPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={e => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t('mineru.config.privacyCheck')}</span>
          </label>

          <button
            onClick={handleSaveConfig}
            disabled={!endpoint.trim() || !apiKey.trim() || !privacyAccepted}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            {t('mineru.config.save')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          {t('mineru.title')}
        </h3>
        <button
          onClick={() => setShowConfig(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <Settings className="w-3 h-3" />
          {t('mineru.configButton')}
        </button>
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
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-red-400 hover:bg-red-50/30 dark:hover:border-red-500 dark:hover:bg-red-900/20 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="w-8 h-8 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('mineru.dropzone.text')}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t('mineru.dropzone.formats')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <FileText className="w-4 h-4 text-red-500" />
              <span className="font-medium">{file.name}</span>
              <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
            </div>
            {status !== 'uploading' && (
              <button
                onClick={() => { setFile(null); setStatus('idle'); setResult(''); setError('') }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {status === 'idle' && (
            <button
              onClick={handleProcess}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              {t('mineru.button')}
            </button>
          )}

          {status === 'uploading' && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{progress}</p>
            </div>
          )}

          {status === 'done' && (
            <div className="space-y-3">
              <div className="max-h-80 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-md p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {result.slice(0, 5000)}
                {result.length > 5000 && <span className="text-gray-400">...</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('mineru.download')}
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md p-3">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
