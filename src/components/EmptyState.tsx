import { useCallback } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { Upload, FileText, Combine, Split, Trash2, RotateCw, Hash, Image, FileImage, Droplets, Move, FileSpreadsheet } from 'lucide-react'

export default function EmptyState() {
  const { addFiles } = useApp()
  const { t } = useI18n()

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
    <div className="flex flex-col items-center justify-center gap-6 max-w-lg mx-auto">
      {/* Dropzone only */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={handleClick}
        className="w-full cursor-pointer
          border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12
          hover:border-red-400 hover:bg-red-50/30 dark:hover:border-red-500 dark:hover:bg-red-900/20 transition-colors"
      >
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">{t('emptyState.dropzone.text')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('emptyState.dropzone.hint')}</p>
        </div>
      </div>

      {/* Feature grid - non-interactive, outside dropzone */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {[
          { icon: Combine, label: t('emptyState.feature.merge') },
          { icon: Split, label: t('emptyState.feature.split') },
          { icon: Trash2, label: t('emptyState.feature.delete') },
          { icon: RotateCw, label: t('emptyState.feature.rotate') },
          { icon: Move, label: t('emptyState.feature.reorder') },
          { icon: Hash, label: t('emptyState.feature.pageNumbering') },
          { icon: Droplets, label: t('emptyState.feature.watermark') },
          { icon: Image, label: t('emptyState.feature.pdfToImage') },
          { icon: FileImage, label: t('emptyState.feature.imageToPdf') },
          { icon: FileText, label: t('emptyState.feature.pdfToMd') },
          { icon: FileSpreadsheet, label: t('emptyState.feature.mineru') },
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