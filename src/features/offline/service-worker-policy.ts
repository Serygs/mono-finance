const SHELL_DESTINATIONS = new Set([
  'document',
  'font',
  'image',
  'script',
  'style',
])

export function isPrivateApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

export function isCacheableShellRequest(
  pathname: string,
  destination: string,
  method: string,
): boolean {
  return (
    method === 'GET' &&
    !isPrivateApiPath(pathname) &&
    SHELL_DESTINATIONS.has(destination)
  )
}
