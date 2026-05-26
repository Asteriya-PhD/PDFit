import { useState, useCallback, useRef } from 'react'
import { imagesToPdf, type ImageInput, type PageSize } from '@/lib/imageToPdf'
import { Upload, X, Download, ArrowUpDown } from 'lucide-react'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function ImageToPdfTool() {
  const [images, setImages] = useState<ImageInput[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('auto')
  const [margin, setMargin] = useState(20)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addImages = useCallback(async (fileList: File[]) => {
    const valid = fileList.filter(f => ACCEPTED_TYPES.includes(f.type))
    if (valid.length !== fileList.length) {
      alert('仅支持 PNG、JPEG 和 WebP 格式的图片')
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
  }, [])

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
      downloadBlob(blob, name
      )
    } catch (err) {
      alert('转换失败: ' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  if (images.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">图片转 PDF</h2>

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
          className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-gray-300 rounded-xl
            cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-colors"
        >
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <Upload className="w-7 h-7 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-gray-600">拖拽图片到此处</p>
            <p className="text-sm text-gray-400 mt-1">或点击选择文件</p>
            <p className="text-xs text-gray-300 mt-1">支持 PNG、JPEG、WebP 格式</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">图片转 PDF</h2>

      {/* Thumbnail list */}
      <div className="space-y-2 mb-6">
        {images.map((img, index) => (
          <div key={img.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex gap-1">
              <button
                onClick={() => moveImage(index, -1)}
                disabled={index === 0}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ArrowUpDown className="w-3.5 h-3.5 rotate-180" />
              </button>
              <button
                onClick={() => moveImage(index, 1)}
                disabled={index === images.length - 1}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <img
              src={img.dataUrl}
              alt={img.file.name}
              className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">{img.file.name}</p>
              <p className="text-xs text-gray-400">
                {(img.file.size / 1024).toFixed(1)} KB · {img.file.type.replace('image/', '')}
              </p>
            </div>
            <button
              onClick={() => removeImage(img.id)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add more button */}
      <button
        onClick={handleClick}
        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 mb-6"
      >
        <Upload className="w-4 h-4" /> 添加更多图片
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
          <label className="block text-sm font-medium text-gray-700 mb-2">页面大小</label>
          <div className="flex gap-2">
            {([
              { value: 'auto', label: '自适应' },
              { value: 'a4', label: 'A4' },
              { value: 'letter', label: 'Letter' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setPageSize(opt.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pageSize === opt.value
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            边距: {margin}pt
          </label>
          <input
            type="range"
            min={0}
            max={60}
            value={margin}
            onChange={e => setMargin(Number(e.target.value))}
            className="w-full accent-red-600"
          />
        </div>
      </div>

      <button
        onClick={handleConvert}
        disabled={loading || images.length === 0}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium
          hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {loading ? '处理中...' : `转换为 PDF（${images.length} 张图片）`}
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
