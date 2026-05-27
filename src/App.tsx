import { useApp } from '@/contexts/AppContext'
import Header from '@/components/Header'
import FileDropzone from '@/components/FileDropzone'
import FileList from '@/components/FileList'
import ThumbnailGrid from '@/components/ThumbnailGrid'
import ToolPanel from '@/components/ToolPanel'
import EmptyState from '@/components/EmptyState'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function App() {
  useKeyboardShortcuts()
  const { files } = useApp()

  return (
    <div className="flex flex-col h-full">
      <Header />

      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <aside className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col shrink-0">
            <FileDropzone compact />
            <FileList />
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden">
            <ToolPanel />
            <ThumbnailGrid />
          </main>
        </div>
      )}
    </div>
  )
}
