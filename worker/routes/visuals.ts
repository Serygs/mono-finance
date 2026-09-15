import type { Context } from 'hono'
import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { VisualEnvironment } from '../common/environment'
import { VisualError, VisualService } from '../visuals/visual-service'

type VisualContext = Context<{
  Bindings: VisualEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>
const keyPattern = /^[a-z0-9][a-z0-9:_-]{0,191}$/
export function visualService(context: VisualContext) {
  return new VisualService(context.env.DB, context.env.ASSETS)
}
export async function listVisualsHandler(context: VisualContext) {
  return noStore(
    context.json(
      success(
        await visualService(context).list(context.get('authenticatedUser').id),
      ),
    ),
  )
}
export async function uploadVisualHandler(context: VisualContext) {
  try {
    const form = await context.req.raw.formData()
    const file = form.get('file')
    const assetType = form.get('assetType')
    if (
      !(file instanceof File) ||
      (assetType !== 'merchant-icon' && assetType !== 'category-icon')
    )
      return invalid(context)
    return noStore(
      context.json(
        success({
          asset: await visualService(context).upload(
            context.get('authenticatedUser').id,
            assetType,
            file,
          ),
        }),
        201,
      ),
    )
  } catch (error) {
    return visualFailure(context, error)
  }
}
export async function getVisualAssetHandler(context: VisualContext) {
  try {
    const assetId = context.req.param('assetId') ?? ''
    const asset = await visualService(context).getAsset(
      context.get('authenticatedUser').id,
      assetId,
    )
    const object = await context.env.ASSETS.get(asset.objectKey)
    if (object === null)
      return context.json(failure('not_found', 'Asset not found.'), 404)
    return new Response(object.body, {
      headers: {
        'Content-Type': asset.mimeType,
        'Cache-Control': 'private, max-age=31536000, immutable',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        ...(asset.mimeType === 'image/svg+xml'
          ? {
              'Content-Security-Policy':
                "default-src 'none'; style-src 'none'; sandbox",
            }
          : {}),
      },
    })
  } catch (error) {
    return visualFailure(context, error)
  }
}
export async function setMerchantVisualHandler(context: VisualContext) {
  return mapping(context, 'merchant')
}
export async function deleteMerchantVisualHandler(context: VisualContext) {
  const key = context.req.param('merchantKey') ?? ''
  if (!keyPattern.test(key)) return invalid(context)
  await visualService(context).setMerchant(
    context.get('authenticatedUser').id,
    key,
    key,
    null,
  )
  return noStore(context.json(success({ merchantKey: key })))
}
export async function setCategoryVisualHandler(context: VisualContext) {
  return mapping(context, 'category')
}
export async function deleteCategoryVisualHandler(context: VisualContext) {
  const key = context.req.param('categoryKey') ?? ''
  if (!keyPattern.test(key)) return invalid(context)
  await visualService(context).setCategory(
    context.get('authenticatedUser').id,
    key,
    null,
  )
  return noStore(context.json(success({ categoryKey: key })))
}
async function mapping(context: VisualContext, type: 'merchant' | 'category') {
  try {
    const key =
      context.req.param(type === 'merchant' ? 'merchantKey' : 'categoryKey') ??
      ''
    const body = await context.req.json<{
      assetId?: unknown
      displayName?: unknown
    }>()
    const displayName = body.displayName
    const assetId = body.assetId
    if (
      !keyPattern.test(key) ||
      typeof assetId !== 'string' ||
      assetId.length > 64 ||
      (type === 'merchant' &&
        (typeof displayName !== 'string' ||
          displayName.trim().length === 0 ||
          displayName.length > 256))
    )
      return invalid(context)
    if (type === 'merchant')
      await visualService(context).setMerchant(
        context.get('authenticatedUser').id,
        key,
        displayName as string,
        assetId,
      )
    else
      await visualService(context).setCategory(
        context.get('authenticatedUser').id,
        key,
        assetId,
      )
    return noStore(context.json(success({ key, assetId })))
  } catch (error) {
    return visualFailure(context, error)
  }
}
function invalid(context: VisualContext) {
  return noStore(
    context.json(failure('validation_error', 'Invalid visual input.'), 400),
  )
}
function visualFailure(context: VisualContext, error: unknown) {
  if (error instanceof VisualError || error instanceof Error)
    return noStore(
      context.json(
        failure('validation_error', 'The image could not be accepted.'),
        400,
      ),
    )
  throw error
}
function noStore(response: Response) {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
