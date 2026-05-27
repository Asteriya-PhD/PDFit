import { useApp } from '@/contexts/AppContext'
import MergeTool from '@/components/tools/MergeTool'
import SplitTool from '@/components/tools/SplitTool'
import DeleteTool from '@/components/tools/DeleteTool'
import RotateTool from '@/components/tools/RotateTool'
import PageNumberingTool from '@/components/tools/PageNumberingTool'
import PdfToImageTool from '@/components/tools/PdfToImageTool'
import ImageToPdfTool from '@/components/tools/ImageToPdfTool'
import PdfToMdTool from '@/components/tools/PdfToMdTool'

export default function ToolPanel() {
  const { files, activeTool } = useApp()
  const activeFile = files.find(f => f.id === useApp().activeFileId)

  const panels: Record<string, React.ReactNode> = {
    merge: <MergeTool />,
    split: <SplitTool />,
    delete: <DeleteTool />,
    rotate: <RotateTool />,
    'page-numbering': <PageNumberingTool />,
    'pdf-to-image': <PdfToImageTool />,
    'image-to-pdf': <ImageToPdfTool />,
    'pdf-to-md': <PdfToMdTool />,
  }

  if (!activeTool) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">从上方工具栏选择一个操作</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
            {files.length > 0 ? '当前已加载 ' + files.length + ' 个文件' : '请先导入 PDF 文件'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {panels[activeTool] ?? (
        <div className="text-center text-gray-400 text-sm py-12">工具加载中...</div>
      )}
    </div>
  )
}
