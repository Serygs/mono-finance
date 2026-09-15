export const SVG_MIME_TYPE = 'image/svg+xml'
export const MAX_SVG_SIZE_BYTES = 64 * 1024
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
export const SUPPORTED_IMAGE_TYPES = [
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const
export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

export class SvgValidationError extends Error {}

const forbidden =
  /<(?:script|foreignobject|iframe|object|embed|audio|video|animate(?:motion|transform|color)?|set|style|metadata)\b|\son\w+\s*=|(?:href|xlink:href)\s*=\s*["']?(?:javascript:|https?:|data:|\/\/)|@import|url\s*\(/i
const allowedElements = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'title',
  'desc',
  'defs',
  'clippath',
  'mask',
  'lineargradient',
  'radialgradient',
  'stop',
])
const allowedAttributes =
  /^(?:viewBox|xmlns|width|height|fill|fill-rule|clip-rule|d|cx|cy|r|rx|ry|x|y|x1|x2|y1|y2|points|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-dasharray|stroke-dashoffset|opacity|fill-opacity|stroke-opacity|transform|offset|stop-color|stop-opacity|gradientUnits|gradientTransform|id|clip-path|clipPathUnits|mask|maskUnits|maskContentUnits|preserveAspectRatio|role|aria-label)$/i

export function sanitizeSvg(input: string, mimeType: string): string {
  if ((mimeType.toLowerCase().split(';')[0] ?? '').trim() !== SVG_MIME_TYPE)
    throw new SvgValidationError('SVG files only are supported.')
  const bytes = new TextEncoder().encode(input)
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SVG_SIZE_BYTES)
    throw new SvgValidationError('SVG must be no larger than 64 KB.')
  if (forbidden.test(input))
    throw new SvgValidationError('SVG contains unsafe content.')
  const root = input.match(/<svg\b([^>]*)>/i)
  if (
    root === null ||
    root[1] === undefined ||
    !/\bviewBox\s*=\s*["']\s*[-+\d.]+\s+[-+\d.]+\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s*["']/i.test(
      root[1],
    )
  )
    throw new SvgValidationError('SVG must include a valid viewBox.')
  const sanitized = input.replace(
    /<\/?([\w:-]+)([^>]*)>/g,
    (tag, name: string, attributes: string) => {
      const element = name?.toLowerCase()
      if (element === undefined) throw new SvgValidationError('Malformed SVG.')
      if (!allowedElements.has(element))
        throw new SvgValidationError('SVG contains an unsupported element.')
      if (tag.startsWith('</')) return `</${element}>`
      const safeAttributes: string[] = []
      attributes.replace(
        /([\w:-]+)\s*=\s*(["'])(.*?)\2/g,
        (_attribute, key: string, quote: string, value: string) => {
          if (
            !allowedAttributes.test(key) ||
            /(?:javascript:|https?:|data:|url\s*\()/i.test(value)
          )
            throw new SvgValidationError('SVG contains an unsafe attribute.')
          safeAttributes.push(`${key}=${quote}${value}${quote}`)
          return ''
        },
      )
      return `<${element}${safeAttributes.length ? ` ${safeAttributes.join(' ')}` : ''}>`
    },
  )
  if (!/^\s*<svg\b/i.test(sanitized) || !/<\/svg>\s*$/i.test(sanitized))
    throw new SvgValidationError('Malformed SVG.')
  return sanitized
}

export function validateRasterImage(
  bytes: Uint8Array,
  mimeType: string,
): SupportedImageType {
  const type = mimeType.toLowerCase().split(';')[0]?.trim()
  if (
    type !== 'image/png' &&
    type !== 'image/jpeg' &&
    type !== 'image/webp' &&
    type !== 'image/gif'
  )
    throw new SvgValidationError('Unsupported image format.')
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_SIZE_BYTES)
    throw new SvgValidationError('Image must be no larger than 2 MB.')
  const valid =
    (type === 'image/png' &&
      startsWith(bytes, [137, 80, 78, 71, 13, 10, 26, 10])) ||
    (type === 'image/jpeg' && startsWith(bytes, [255, 216, 255])) ||
    (type === 'image/gif' &&
      (startsWith(bytes, [71, 73, 70, 56, 55, 97]) ||
        startsWith(bytes, [71, 73, 70, 56, 57, 97]))) ||
    (type === 'image/webp' &&
      startsWith(bytes, [82, 73, 70, 70]) &&
      bytes[8] === 87 &&
      bytes[9] === 69 &&
      bytes[10] === 66 &&
      bytes[11] === 80)
  if (!valid)
    throw new SvgValidationError('Image content does not match its type.')
  return type
}
function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value)
}
