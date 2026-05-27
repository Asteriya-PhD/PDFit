const STORAGE_KEY = 'pdfx-mineru-config'
const CONSENT_KEY = 'pdfx-mineru-consent'

export function hasConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true'
}

export function saveConsent(): void {
  localStorage.setItem(CONSENT_KEY, 'true')
}

export function clearConsent(): void {
  localStorage.removeItem(CONSENT_KEY)
}

/** Get the API key from env var (VITE_MINERU_API_KEY) */
export function getBuiltInApiKey(): string | null {
  try {
    return import.meta.env.VITE_MINERU_API_KEY || null
  } catch {
    return null
  }
}

interface PresignedUrl {
  url: string
  filename: string
}

interface TaskResponse {
  task_id: string
  status: string
}

interface ExtractResult {
  markdown: string
  images?: Record<string, string>
}

export function loadConfig(): { endpoint: string; apiKey: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveConfig(endpoint: string, apiKey: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ endpoint, apiKey }))
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function apiUrl(endpoint: string, path: string): string {
  const base = endpoint.replace(/\/+$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

async function apiFetch(url: string, options: RequestInit): Promise<Response> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MinerU API error (${res.status}): ${text || res.statusText}`)
  }
  return res
}

export async function uploadAndExtract(
  endpoint: string,
  apiKey: string,
  file: File,
  onProgress?: (msg: string) => void,
): Promise<ExtractResult> {
  onProgress?.('获取上传地址...')

  const presignedRes = await apiFetch(apiUrl(endpoint, '/api/v4/file-urls/batch'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_names: [file.name] }),
  })
  const presignedData: { data: PresignedUrl[] } = await presignedRes.json()
  const uploadInfo = presignedData.data[0]
  if (!uploadInfo) throw new Error('获取上传地址失败')

  onProgress?.(`上传 ${file.name}...`)
  await apiFetch(uploadInfo.url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'application/octet-stream' },
  })

  onProgress?.('提交解析任务...')
  const taskRes = await apiFetch(apiUrl(endpoint, '/api/v4/extract/task/batch'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [{ url: uploadInfo.url, name: file.name }],
      enable_formula: true,
      enable_table: true,
      layout_model: 'doclayout_yolo',
      language: 'auto',
    }),
  })
  const taskData: { data: TaskResponse[] } = await taskRes.json()
  const firstTask = taskData.data[0]
  if (!firstTask) throw new Error('提交解析任务失败')
  const { task_id } = firstTask

  onProgress?.('等待解析完成...')
  let finalStatus: TaskResponse | undefined
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await apiFetch(apiUrl(endpoint, `/api/v4/extract/task/${task_id}`), {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const s: TaskResponse = await statusRes.json()
    finalStatus = s
    if (s.status === 'done' || s.status === 'failed') break
    onProgress?.(`解析中... (${(i + 1) * 5}s)`)
  }

  if (!finalStatus || finalStatus.status !== 'done') {
    throw new Error('解析超时或失败')
  }

  onProgress?.('下载结果...')
  const resultRes = await apiFetch(apiUrl(endpoint, `/api/v4/extract/result/${task_id}`), {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  const contentDisposition = resultRes.headers.get('Content-Disposition') || ''
  const isZip = contentDisposition.includes('.zip') || contentDisposition.includes('zip')

  if (isZip) {
    const blob = await resultRes.blob()
    const zipModule = await import('jszip')
    const zip = await zipModule.default.loadAsync(blob)
    const mdFile = Object.keys(zip.files).find(f => f.endsWith('.md') || f === 'full.md')
    if (!mdFile) throw new Error('结果中未找到 Markdown 文件')
    const mdEntry = zip.files[mdFile]
    if (!mdEntry) throw new Error('结果中未找到 Markdown 文件')
    const markdown = await mdEntry.async('text')

    const images: Record<string, string> = {}
    for (const [name, entry] of Object.entries(zip.files)) {
      if (!entry.dir && name.startsWith('images/')) {
        const buf = await entry.async('base64')
        const ext = name.split('.').pop() || 'png'
        images[name] = `data:image/${ext};base64,${buf}`
      }
    }
    return { markdown, images: Object.keys(images).length > 0 ? images : undefined }
  }

  const json = await resultRes.json()
  const markdown = json.data?.markdown || json.markdown || json.result?.markdown || ''
  return { markdown }
}
