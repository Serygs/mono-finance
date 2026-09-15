export const SVG_MIME_TYPE = 'image/svg+xml'
export const MAX_SVG_SIZE_BYTES = 64 * 1024

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
