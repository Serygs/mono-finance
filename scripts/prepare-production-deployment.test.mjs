import { describe, expect, it } from 'vitest'

import { prepareProductionDeploymentConfig } from './prepare-production-deployment.mjs'

const productionBuildConfig = {
  main: 'index.js',
  vars: { APP_ENV: 'production' },
}

describe('prepareProductionDeploymentConfig', () => {
  it('adds the real production D1 binding without putting secrets in the config', () => {
    const config = prepareProductionDeploymentConfig(
      '123e4567-e89b-12d3-a456-426614174000',
      productionBuildConfig,
    )

    expect(config.d1_databases).toEqual([
      {
        binding: 'DB',
        database_name: 'mono-finance-production',
        database_id: '123e4567-e89b-12d3-a456-426614174000',
        migrations_dir: '../../migrations',
      },
    ])
    expect(config.secrets).toEqual({
      required: ['MONOBANK_TOKEN', 'SESSION_TOKEN_PEPPER', 'SETUP_TOKEN'],
    })
  })

  it('rejects an invalid database ID or a non-production build', () => {
    expect(() =>
      prepareProductionDeploymentConfig(
        'not-a-database-id',
        productionBuildConfig,
      ),
    ).toThrow('CLOUDFLARE_D1_DATABASE_ID')
    expect(() =>
      prepareProductionDeploymentConfig(
        '123e4567-e89b-12d3-a456-426614174000',
        {
          vars: { APP_ENV: 'development' },
        },
      ),
    ).toThrow('production Cloudflare environment')
  })
})
