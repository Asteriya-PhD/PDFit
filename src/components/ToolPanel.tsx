import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import MergeTool from '@/components/tools/MergeTool'
import SplitTool from '@/components/tools/SplitTool'
import DeleteTool from '@/components/tools/DeleteTool'
import RotateTool from '@/components/tools/RotateTool'
import ReorderTool from '@/components/tools/ReorderTool'
import PageNumberingTool from '@/components/tools/PageNumberingTool'
import WatermarkTool from '@/components/tools/WatermarkTool'
import PdfToImageTool from '@/components/tools/PdfToImageTool'
import ImageToPdfTool from '@/components/tools/ImageToPdfTool'
import PdfToMdTool from '@/components/tools/PdfToMdTool'
import MineruTool from '@/components/tools/MineruTool'

export default function ToolPanel() {
  const { files, activeTool } = useApp()
  const { t } = useI18n()
  const activeFile = files.find(f => f.id === useApp().activeFileId)

  const panels: Record<string, React.ReactNode> = {
    merge: <MergeTool />,
    split: <SplitTool />,
    delete: <DeleteTool />,
    rotate: <RotateTool />,
    reorder: <ReorderTool />,
    'page-numbering': <PageNumberingTool />,
    watermark: <WatermarkTool />,
    'pdf-to-image': <PdfToImageTool />,
    'image-to-pdf': <ImageToPdfTool />,
    'pdf-to-md': <PdfToMdTool />,
    mineru: <MineruTool />,
  }

  if (!activeTool) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">{t('toolPanel.noTool')}</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
            {files.length > 0 ? t('toolPanel.fileCount', { count: files.length }) : t('toolPanel.noFile')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {panels[activeTool] ?? (
        <div className="text-center text-gray-400 text-sm py-12">{t('toolPanel.loading')}</div>
      )}
    </div>
  )
}
