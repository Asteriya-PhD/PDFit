import { createContext, useContext, useCallback, useReducer, type ReactNode } from 'react'
import type { PDFFileInfo, ToolType } from '@/types'

interface AppState {
  files: PDFFileInfo[]
  activeFileId: string | null
  activeTool: ToolType
  loading: boolean
}

type Action =
  | { type: 'ADD_FILES'; files: PDFFileInfo[] }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'SET_ACTIVE_FILE'; id: string | null }
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'CLEAR_FILES' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_FILES':
      return {
        ...state,
        files: [...state.files, ...action.files],
        activeFileId: state.activeFileId ?? action.files[0]?.id ?? null,
        activeTool: state.activeTool ?? 'merge',
      }
    case 'REMOVE_FILE': {
      const idx = state.files.findIndex(f => f.id === action.id)
      const updated = state.files.filter(f => f.id !== action.id)
      const newActiveId =
        state.activeFileId === action.id
          ? updated[idx]?.id ?? updated[idx - 1]?.id ?? null
          : state.activeFileId
      return {
        ...state,
        files: updated,
        activeFileId: newActiveId,
      }
    }
    case 'SET_ACTIVE_FILE':
      return { ...state, activeFileId: action.id }
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'CLEAR_FILES':
      return { ...state, files: [], activeFileId: null }
    default:
      return state
  }
}

interface AppContextValue extends AppState {
  addFiles: (files: File[]) => Promise<void>
  removeFile: (id: string) => void
  setActiveFile: (id: string) => void
  setTool: (tool: ToolType) => void
  clearFiles: () => void
  setLoading: (loading: boolean) => void
  getActiveFile: () => PDFFileInfo | undefined
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    files: [],
    activeFileId: null,
    activeTool: null,
    loading: false,
  })

  const addFiles = useCallback(async (fileList: File[]) => {
    const pdfFiles: PDFFileInfo[] = []
    for (const file of fileList) {
      const arrayBuffer = await file.arrayBuffer()
      const { PDFDocument } = await import('pdf-lib')
      let pageCount = 0
      try {
        const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
        pageCount = doc.getPageCount()
      } catch {
        pageCount = 0
      }
      pdfFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        file,
        arrayBuffer,
        pageCount,
      })
    }
    dispatch({ type: 'ADD_FILES', files: pdfFiles })
  }, [])

  const removeFile = useCallback((id: string) => dispatch({ type: 'REMOVE_FILE', id }), [])
  const setActiveFile = useCallback((id: string) => dispatch({ type: 'SET_ACTIVE_FILE', id }), [])
  const setTool = useCallback((tool: ToolType) => dispatch({ type: 'SET_TOOL', tool }), [])
  const clearFiles = useCallback(() => dispatch({ type: 'CLEAR_FILES' }), [])
  const setLoading = useCallback((loading: boolean) => dispatch({ type: 'SET_LOADING', loading }), [])
  const getActiveFile = useCallback(() => state.files.find(f => f.id === state.activeFileId), [state.files, state.activeFileId])

  return (
    <AppContext.Provider
      value={{ ...state, addFiles, removeFile, setActiveFile, setTool, clearFiles, setLoading, getActiveFile }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
