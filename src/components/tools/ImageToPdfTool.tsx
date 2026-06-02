import { useState, useCallback, useRef } from 'react'
import { useI18n } from '@/i18n'
import { imagesToPdf, type ImageInput, type PageSize } from '@/lib/imageToPdf'
import { Upload, X, Download, ArrowUpDown } from 'lucide-react'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function ImageToPdfTool() {
  const { t } = useI18n()
  const [images, setImages] = useState<ImageInput[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('auto')
  const [margin, setMargin] = useState(20)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addImages = useCallback(async (fileList: File[]) => {
    const valid = fileList.filter(f => ACCEPTED_TYPES.includes(f.type))
    if (valid.length !== fileList.length) {
      alert(t('imageToPdf.error.format'))
    }
    const newImages: ImageInput[] = []
    for (const file of valid) {
      newImages.push({
        id: crypto.randomUUID(),
        file,
        dataUrl: URL.createObjectURL(file),
        arrayBuffer: await file.arrayBuffer(),
      })
    }
    setImages(prev => [...prev, ...newImages])
  }, [t])

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.dataUrl)
      return prev.filter(i => i.id !== id)
    })
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages(prev => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      const a = next[index]
      const b = next[target]
      if (a === undefined || b === undefined) return prev
      next[index] = b
      next[target] = a
      return next
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const fileList = Array.from(e.dataTransfer.files)
    addImages(fileList)
  }, [addImages])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addImages(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleConvert = async () => {
    if (images.length === 0) return
    setLoading(true)
    try {
      const result = await imagesToPdf(images, { pageSize, margin })
      const blob = new Blob([result], { type: 'application/pdf' })
      const name = images.length === 1
        ? (images[0]?.file.name.replace(/\.\w+$/, '') ?? 'image') + '.pdf'
        : 'converted_images.pdf'
      downloadBlob(blob, name)
    } catch (err) {
      alert(t('imageToPdf.error', { message: err instanceof Error ? err.message : t('common.error.default') }))
    } finally {
      setLoading(false)
    }
  }

  if (images.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('imageToPdf.title')}</h2>

        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          multiple
          onChange={handleChange}
          className="hidden"
        />

        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleClick}
          className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl
            cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-100)] transition-colors"
        >
          <div className="w-14 h-14 bg-[var(--color-accent-100)] rounded-full flex items-center justify-center">
            <Upload className="w-7 h-7 text-[var(--color-accent)]" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-gray-600 dark:text-gray-300">{t('imageToPdf.empty.text')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('imageToPdf.empty.hint')}</p>
            <p className="text-xs text-gray-300 mt-1">{t('imageToPdf.empty.formats')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('imageToPdf.title')}</h2>

      {/* Thumbnail list */}
      <div className="space-y-2 mb-6">
        {images.map((img, index) => (
          <div key={img.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
            <div className="flex gap-1">
              <button
                onClick={() => moveImage(index, -1)}
                disabled={index === 0}
                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ArrowUpDown className="w-3.5 h-3.5 rotate-180" />
              </button>
              <button
                onClick={() => moveImage(index, 1)}
                disabled={index === images.length - 1}
                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <img
              src={img.dataUrl}
              alt={img.file.name}
              className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-700 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{img.file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('imageToPdf.sizeInfo', { size: (img.file.size / 1024).toFixed(1), format: img.file.type.replace('image/', '') })}
              </p>
            </div>
            <button
              onClick={() => removeImage(img.id)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-[var(--color-accent)] shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add more button */}
      <button
        onClick={handleClick}
        className="flex items-center gap-1 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent)] mb-6"
      >
        <Upload className="w-4 h-4" /> {t('imageToPdf.addMore')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        multiple
        onChange={handleChange}
        className="hidden"
      />

      {/* Options */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('imageToPdf.pageSize')}</label>
          <div className="flex gap-2">
            {([
              { value: 'auto', label: t('imageToPdf.pageSize.auto') },
              { value: 'a4', label: t('imageToPdf.pageSize.a4') },
              { value: 'letter', label: t('imageToPdf.pageSize.letter') },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setPageSize(opt.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pageSize === opt.value
                    ? 'bg-[var(--color-accent-100)] text-[var(--color-accent)] border-[var(--color-accent)]'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {t('imageToPdf.margin', { count: margin })}
          </label>
          <input
            type="range"
            min={0}
            max={60}
            value={margin}
            onChange={e => setMargin(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
      </div>

      <button
        onClick={handleConvert}
        disabled={loading || images.length === 0}
        className="w-full flex items-center justify-center gap-2 btn-primary
          disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading ? t('imageToPdf.loading') : t('imageToPdf.button', { count: images.length })}
      </button>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
