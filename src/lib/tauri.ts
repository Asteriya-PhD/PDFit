import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { isDesktop } from './desktop';

export interface FileDialogOptions {
  filters?: { name: string; extensions: string[] }[];
  defaultName?: string;
  multiple?: boolean;
}

export async function openFileDialog(options?: FileDialogOptions): Promise<File | File[] | null> {
  if (!isDesktop()) {
    // Web fallback: trigger file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options?.filters?.[0]?.extensions.map(e => `.${e}`).join(',') || '.pdf';
      if (options?.multiple) input.multiple = true;

      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) {
          resolve(null);
          return;
        }
        if (options?.multiple) {
          resolve(Array.from(files));
        } else {
          resolve(files[0] ?? null);
        }
      };

      input.click();
    });
  }

  try {
    const result = await open({
      multiple: options?.multiple || false,
      filters: options?.filters,
      title: 'Open PDF File'
    });

    if (!result) return null;

    if (Array.isArray(result)) {
      const files = await Promise.all(
        result.map(async (path) => {
          const contents = await readFile(path);
          const fileName = path.split('/').pop() || 'document.pdf';
          return new File([contents], fileName, { type: 'application/pdf' });
        })
      );
      return files;
    }

    const contents = await readFile(result);
    const fileName = result.split('/').pop() || 'document.pdf';
    return new File([contents], fileName, { type: 'application/pdf' });
  } catch (error) {
    console.error('Error opening file:', error);
    return null;
  }
}

export async function saveFileDialog(file: Blob, defaultName?: string): Promise<string | null> {
  if (!isDesktop()) {
    // Web fallback: download via anchor
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName || 'document.pdf';
    a.click();
    URL.revokeObjectURL(url);
    return defaultName || null;
  }

  try {
    const filePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      title: 'Save PDF File'
    });

    if (!filePath) return null;

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, new Uint8Array(arrayBuffer));
    
    return filePath;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}