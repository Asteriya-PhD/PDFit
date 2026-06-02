import { useApp } from '@/contexts/AppContext'
import Header from '@/components/Header'
import FileDropzone from '@/components/FileDropzone'
import FileList from '@/components/FileList'
import ThumbnailGrid from '@/components/ThumbnailGrid'
import ToolPanel from '@/components/ToolPanel'
import EmptyState from '@/components/EmptyState'
import ImageToPdfTool from '@/components/tools/ImageToPdfTool'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function App() {
  useKeyboardShortcuts()
  const { files, activeTool } = useApp()

  const showImageToPdf = activeTool === 'image-to-pdf' && files.length === 0

  return (
    <div
      className="h-[100dvh] flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <Header />

      {showImageToPdf ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <ImageToPdfTool />
        </div>
      ) : files.length === 0 ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <EmptyState />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Sidebar - File Management */}
          <aside
            className="flex flex-col overflow-hidden shrink-0 w-full lg:w-[280px] xl:w-[320px] max-h-[40vh] lg:max-h-full border-b lg:border-b-0"
            style={{
              borderColor: 'var(--color-border)',
              borderRightWidth: '1px',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <FileDropzone compact />
            <FileList />
            <ThumbnailGrid vertical />
          </aside>

          {/* Right Panel - Tools */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <ToolPanel />
          </main>
        </div>
      )}
    </div>
  )
}
