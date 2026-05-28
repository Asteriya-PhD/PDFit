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
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center animate-fadeIn">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              style={{ color: 'var(--color-text-muted)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>

          {/* Text */}
          <p
            className="text-lg mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {t('toolPanel.noTool')}
          </p>
          <p
            className="text-sm max-w-xs mx-auto"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {files.length > 0
              ? t('toolPanel.fileCount', { count: files.length })
              : t('toolPanel.noFile')}
          </p>

          {/* Hint */}
          {files.length > 0 && (
            <p
              className="text-xs mt-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Select a tool from the toolbar above to get started
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto animate-fadeIn">
        {panels[activeTool] ?? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {t('toolPanel.loading')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
