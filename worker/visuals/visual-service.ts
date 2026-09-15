import {
  sanitizeSvg,
  SvgValidationError,
  validateRasterImage,
} from './svg-sanitizer'

export interface VisualMapping {
  key: string
  assetId: string
}
export interface VisualAsset {
  id: string
  objectKey: string
  mimeType: string
  sizeBytes: number
  assetType: 'merchant-icon' | 'category-icon'
}
export class VisualError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

export class VisualService {
  private readonly database: D1Database
  private readonly assets: R2Bucket
  constructor(database: D1Database, assets: R2Bucket) {
    this.database = database
    this.assets = assets
  }
  async list(userId: string) {
    const [merchants, categories] = await Promise.all([
      this.database
        .prepare(
          'SELECT merchant_key AS key, icon_asset_id AS assetId FROM merchant_visuals WHERE user_id = ? AND icon_asset_id IS NOT NULL',
        )
        .bind(userId)
        .all<VisualMapping>(),
      this.database
        .prepare(
          'SELECT category_key AS key, icon_asset_id AS assetId FROM category_visuals WHERE user_id = ? AND icon_asset_id IS NOT NULL',
        )
        .bind(userId)
        .all<VisualMapping>(),
    ])
    return {
      merchantVisuals: merchants.results,
      categoryVisuals: categories.results,
    }
  }
  async upload(
    userId: string,
    assetType: 'merchant-icon' | 'category-icon',
    file: File,
  ) {
    if (file.size > 2 * 1024 * 1024) throw new VisualError('invalid_image')
    const content =
      file.type === 'image/svg+xml'
        ? sanitizeSvg(await file.text(), file.type)
        : new Uint8Array(await file.arrayBuffer())
    const mimeType =
      file.type === 'image/svg+xml'
        ? 'image/svg+xml'
        : validateRasterImage(content as Uint8Array, file.type)
    const id = crypto.randomUUID()
    const extension =
      mimeType === 'image/svg+xml'
        ? 'svg'
        : mimeType === 'image/jpeg'
          ? 'jpg'
          : mimeType.slice(6)
    const objectKey = `${assetType === 'merchant-icon' ? 'merchant-icons' : 'category-icons'}/${id}.${extension}`
    await this.assets.put(objectKey, content, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    })
    try {
      await this.database
        .prepare(
          'INSERT INTO visual_assets (id, user_id, object_key, asset_type, mime_type, size_bytes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())',
        )
        .bind(
          id,
          userId,
          objectKey,
          assetType,
          mimeType,
          content instanceof Uint8Array
            ? content.byteLength
            : new TextEncoder().encode(content).byteLength,
        )
        .run()
    } catch (error) {
      await this.assets.delete(objectKey)
      throw error
    }
    return {
      id,
      objectKey,
      mimeType,
      sizeBytes:
        content instanceof Uint8Array
          ? content.byteLength
          : new TextEncoder().encode(content).byteLength,
      assetType,
    }
  }
  async setMerchant(
    userId: string,
    merchantKey: string,
    displayName: string,
    assetId: string | null,
  ) {
    await this.setMapping(
      'merchant_visuals',
      'merchant_key',
      userId,
      merchantKey,
      assetId,
      displayName,
    )
  }
  async setCategory(
    userId: string,
    categoryKey: string,
    assetId: string | null,
  ) {
    await this.setMapping(
      'category_visuals',
      'category_key',
      userId,
      categoryKey,
      assetId,
    )
  }
  private async setMapping(
    table: 'merchant_visuals' | 'category_visuals',
    keyColumn: 'merchant_key' | 'category_key',
    userId: string,
    key: string,
    assetId: string | null,
    displayName?: string,
  ) {
    if (assetId !== null) {
      const valid = await this.database
        .prepare('SELECT id FROM visual_assets WHERE id = ? AND user_id = ?')
        .bind(assetId, userId)
        .first()
      if (valid === null) throw new VisualError('asset_not_found')
    }
    if (assetId === null)
      await this.database
        .prepare(`DELETE FROM ${table} WHERE user_id = ? AND ${keyColumn} = ?`)
        .bind(userId, key)
        .run()
    else if (table === 'merchant_visuals')
      await this.database
        .prepare(
          'INSERT INTO merchant_visuals (id,user_id,merchant_key,display_name,icon_asset_id,created_at,updated_at) VALUES (?,?,?,?,?,unixepoch(),unixepoch()) ON CONFLICT(user_id,merchant_key) DO UPDATE SET display_name=excluded.display_name,icon_asset_id=excluded.icon_asset_id,updated_at=unixepoch()',
        )
        .bind(crypto.randomUUID(), userId, key, displayName, assetId)
        .run()
    else
      await this.database
        .prepare(
          'INSERT INTO category_visuals (id,user_id,category_key,icon_asset_id,created_at,updated_at) VALUES (?,?,?,?,unixepoch(),unixepoch()) ON CONFLICT(user_id,category_key) DO UPDATE SET icon_asset_id=excluded.icon_asset_id,updated_at=unixepoch()',
        )
        .bind(crypto.randomUUID(), userId, key, assetId)
        .run()
    await this.cleanupUnreferenced(userId)
  }
  async getAsset(userId: string, id: string) {
    const asset = await this.database
      .prepare(
        'SELECT id, object_key AS objectKey, mime_type AS mimeType, size_bytes AS sizeBytes, asset_type AS assetType FROM visual_assets WHERE id = ? AND user_id = ?',
      )
      .bind(id, userId)
      .first<VisualAsset>()
    if (asset === null) throw new VisualError('asset_not_found')
    return asset
  }
  private async cleanupUnreferenced(userId: string) {
    const stale = await this.database
      .prepare(
        'SELECT id, object_key AS objectKey FROM visual_assets WHERE user_id = ? AND NOT EXISTS (SELECT 1 FROM merchant_visuals WHERE icon_asset_id = visual_assets.id) AND NOT EXISTS (SELECT 1 FROM category_visuals WHERE icon_asset_id = visual_assets.id)',
      )
      .bind(userId)
      .all<{ id: string; objectKey: string }>()
    for (const asset of stale.results) {
      await this.assets.delete(asset.objectKey)
      await this.database
        .prepare('DELETE FROM visual_assets WHERE id = ?')
        .bind(asset.id)
        .run()
    }
  }
}
export { SvgValidationError }
