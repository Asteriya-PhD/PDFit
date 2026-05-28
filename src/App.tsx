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
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <Header />

      {showImageToPdf ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <ImageToPdfTool />
        </div>
      ) : files.length === 0 ? (
        <div className="flex-1 overflow-hidden">
          <EmptyState />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside
            className="w-72 flex flex-col shrink-0"
            style={{
              borderRight: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <FileDropzone compact />
            <FileList />
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <ToolPanel />
            <ThumbnailGrid />
          </main>
        </div>
      )}
    </div>
  )
}
