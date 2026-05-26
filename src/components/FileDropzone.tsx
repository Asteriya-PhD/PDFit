import { useCallback, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { Upload } from 'lucide-react'

export default function FileDropzone({ compact = false }: { compact?: boolean }) {
  const { addFiles } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const fileList = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
      if (fileList.length > 0) addFiles(fileList)
    },
    [addFiles]
  )

  const handleClick = () => inputRef.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  if (compact) {
    return (
      <>
        <input ref={inputRef} type="file" accept=".pdf" multiple onChange={handleChange} className="hidden" />
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleClick}
          className="flex items-center gap-2 p-3 m-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer
            hover:border-red-300 hover:bg-red-50/30 transition-colors text-sm text-gray-500"
        >
          <Upload className="w-4 h-4 text-gray-400" />
          <span>添加 PDF 文件</span>
        </div>
      </>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf" multiple onChange={handleChange} className="hidden" />
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={handleClick}
        className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-gray-300 rounded-xl
          cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-colors"
      >
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <Upload className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-gray-600">拖拽 PDF 到此处</p>
          <p className="text-sm text-gray-400 mt-1">或点击选择文件</p>
        </div>
      </div>
    </>
  )
}
