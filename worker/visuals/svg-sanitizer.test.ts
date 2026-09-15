import { describe, expect, it } from 'vitest'
import {
  MAX_SVG_SIZE_BYTES,
  sanitizeSvg,
  SvgValidationError,
} from './svg-sanitizer'

const valid = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'
describe('sanitizeSvg', () => {
  it('accepts a static SVG with a viewBox', () =>
    expect(sanitizeSvg(valid, 'image/svg+xml')).toContain('<svg'))
  it('rejects an invalid MIME type, invalid viewBox and oversized input', () => {
    expect(() => sanitizeSvg(valid, 'image/png')).toThrow(SvgValidationError)
    expect(() => sanitizeSvg('<svg><path/></svg>', 'image/svg+xml')).toThrow(
      SvgValidationError,
    )
    expect(() =>
      sanitizeSvg(
        `<svg viewBox="0 0 1 1"><desc>${'x'.repeat(MAX_SVG_SIZE_BYTES)}</desc></svg>`,
        'image/svg+xml',
      ),
    ).toThrow(SvgValidationError)
  })
  it('rejects active and external SVG content', () => {
    expect(() =>
      sanitizeSvg(
        '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>',
        'image/svg+xml',
      ),
    ).toThrow(SvgValidationError)
    expect(() =>
      sanitizeSvg(
        '<svg viewBox="0 0 1 1"><image href="https://bad.example/a"/></svg>',
        'image/svg+xml',
      ),
    ).toThrow(SvgValidationError)
  })
})
