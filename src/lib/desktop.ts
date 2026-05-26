/**
 * Detects if the app is running in Tauri desktop environment.
 * Uses multiple detection methods for reliability.
 */
export function isDesktop(): boolean {
  // Method 1: Check for Tauri window API
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return true;
  }

  // Method 2: Check for Tauri plugin APIs
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.__TAURI_INTERNALS__ || win.__TAURI_PLUGIN__) {
      return true;
    }
  }

  // Method 3: Check user agent (fallback, less reliable)
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('tauri')) {
      return true;
    }
  }

  return false;
}

/**
 * Get the platform: 'windows', 'macos', 'linux', or 'web'
 */
export function getPlatform(): 'windows' | 'macos' | 'linux' | 'web' {
  if (!isDesktop()) return 'web';
  
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';
  }
  
  return 'web';
}