import { describe, expect, it, vi } from 'vitest'
import { runDevelopment } from './run-vite-development.mjs'

describe('development startup', () => {
  it('migrates only local development D1 before starting Vite with caller arguments', () => {
    const spawn = vi.fn().mockReturnValue({ status: 0 })
    expect(runDevelopment(['--port', '5174'], spawn)).toBe(0)
    const migration = spawn.mock.calls[0]
    expect(migration[1].slice(1)).toEqual([
      'd1',
      'migrations',
      'apply',
      'DB',
      '--env',
      'development',
      '--local',
      '--persist-to',
      '.wrangler/state',
    ])
    expect(migration[2].env.CLOUDFLARE_ENV).toBe('development')
    expect(spawn.mock.calls[1][1].slice(1)).toEqual([
      '--mode',
      'development',
      '--port',
      '5174',
    ])
    expect(spawn.mock.calls[1][2].cwd).toBe(migration[2].cwd)
  })

  it('does not start Vite if migrations fail', () => {
    const spawn = vi.fn().mockReturnValue({ status: 2 })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(runDevelopment([], spawn)).toBe(2)
      expect(spawn).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('Local D1 migration failed'),
      )
    } finally {
      log.mockRestore()
    }
  })

  it('preserves process launch errors and interrupted migration failures', () => {
    const error = new Error('spawn failed')
    expect(() => runDevelopment([], () => ({ error }))).toThrow(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(runDevelopment([], () => ({ status: null }))).toBe(1)
    } finally {
      log.mockRestore()
    }
  })
})
