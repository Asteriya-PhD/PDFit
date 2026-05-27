import { useCallback } from 'react'
import { useApp } from '@/contexts/AppContext'
import { Upload, FileText, Combine, Split, Trash2, RotateCw, Hash, Image, FileImage, Droplets } from 'lucide-react'

export default function EmptyState() {
  const { addFiles } = useApp()

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
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

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onClick={handleClick}
      className="flex flex-col items-center justify-center gap-6 max-w-lg mx-auto cursor-pointer
        border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12
        hover:border-red-400 hover:bg-red-50/30 dark:hover:border-red-500 dark:hover:bg-red-900/20 transition-colors"
    >
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <Upload className="w-8 h-8 text-red-500" />
      </div>

      <div className="text-center">
        <p className="text-lg font-medium text-gray-700 dark:text-gray-200">拖拽 PDF 文件到此处</p>
        <p className="text-sm text-gray-400 mt-1">或点击选择文件</p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full mt-2">
        {[
          { icon: Combine, label: '合并 PDF' },
          { icon: Split, label: '分割页面' },
          { icon: Trash2, label: '删除页面' },
          { icon: RotateCw, label: '旋转页面' },
          { icon: Hash, label: '添加页码' },
          { icon: Droplets, label: '添加水印' },
          { icon: Image, label: 'PDF转图片' },
          { icon: FileImage, label: '图片转PDF' },
          { icon: FileText, label: '提取Markdown' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
            <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
