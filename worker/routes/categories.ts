import type { Context } from 'hono'
import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import {
  CategoryError,
  type CreateCategoryInput,
  type CategoryService,
} from '../services/category-service'

type CategoryContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

export async function listCategoriesHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return noStore(
    context.json(
      success({
        categories: await service.list(context.get('authenticatedUser').id),
      }),
    ),
  )
}
export async function listSourceCategoriesHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return noStore(
    context.json(
      success({
        sources: await service.listSources(context.get('authenticatedUser').id),
      }),
    ),
  )
}
export async function saveSourceCategoryHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return categoryOperation(context, async () =>
    context.json(
      success({
        source: await service.setSourceMapping(
          context.get('authenticatedUser').id,
          sourceCode(context),
          await readCategoryId(context.req.raw),
        ),
      }),
    ),
  )
}
export async function resetSourceCategoryHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return categoryOperation(context, async () =>
    context.json(
      success({
        source: await service.resetSourceMapping(
          context.get('authenticatedUser').id,
          sourceCode(context),
        ),
      }),
    ),
  )
}
export async function createCategoryHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return categoryOperation(context, async () =>
    context.json(
      success({
        category: await service.create(
          context.get('authenticatedUser').id,
          await readCategory(context.req.raw),
        ),
      }),
      201,
    ),
  )
}
export async function updateCategoryHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return categoryOperation(context, async () =>
    context.json(
      success({
        category: await service.update(
          context.get('authenticatedUser').id,
          categoryId(context),
          await readCategory(context.req.raw),
        ),
      }),
    ),
  )
}
export async function deleteCategoryHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return categoryOperation(context, async () => {
    await service.delete(
      context.get('authenticatedUser').id,
      categoryId(context),
    )
    return context.json(success({}))
  })
}
export async function mergeCategoryHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return categoryOperation(context, async () =>
    context.json(
      success({
        category: await service.merge(
          context.get('authenticatedUser').id,
          categoryId(context),
          await readTargetCategoryId(context.req.raw),
        ),
      }),
    ),
  )
}
export async function saveTransactionCategoryHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return categoryOperation(context, async () =>
    context.json(
      success(
        await service.setTransactionOverride(
          context.get('authenticatedUser').id,
          transactionId(context),
          await readCategoryId(context.req.raw),
        ),
      ),
    ),
  )
}
export async function resetTransactionCategoryHandler(
  context: CategoryContext,
  service: CategoryService,
) {
  return categoryOperation(context, async () =>
    context.json(
      success(
        await service.resetTransactionOverride(
          context.get('authenticatedUser').id,
          transactionId(context),
        ),
      ),
    ),
  )
}

async function categoryOperation(
  context: CategoryContext,
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return noStore(await operation())
  } catch (error) {
    if (!(error instanceof CategoryError)) throw error
    if (error.code === 'category_referenced')
      return noStore(
        context.json(
          failure(
            'category_referenced',
            'Reset or reassign transaction overrides and imported type mappings before deleting this category.',
          ),
          409,
        ),
      )
    if (
      error.code === 'category_not_found' ||
      error.code === 'transaction_not_found'
    )
      return noStore(
        context.json(failure('not_found', 'Resource was not found.'), 404),
      )
    return noStore(
      context.json(failure('validation_error', 'Invalid category input.'), 400),
    )
  }
}
async function readCategory(request: Request): Promise<CreateCategoryInput> {
  const input = await json(request)
  const name = text(input['name'], 80)
  const icon = optionalToken(input['icon'])
  const colorToken = optionalToken(input['colorToken'])
  if (name === null || icon === undefined || colorToken === undefined)
    throw new CategoryError('invalid_category')
  return { name, icon, colorToken }
}
async function readCategoryId(request: Request): Promise<string> {
  const input = await json(request)
  const value = text(input['categoryId'], 128)
  if (value === null) throw new CategoryError('invalid_category')
  return value
}
async function readTargetCategoryId(request: Request): Promise<string> {
  const input = await json(request)
  const value = text(input['targetCategoryId'], 128)
  if (value === null) throw new CategoryError('invalid_category')
  return value
}
async function json(request: Request): Promise<Record<string, unknown>> {
  try {
    const input: unknown = await request.json()
    if (typeof input !== 'object' || input === null || Array.isArray(input))
      throw new CategoryError('invalid_category')
    return input as Record<string, unknown>
  } catch (error) {
    if (error instanceof CategoryError) throw error
    throw new CategoryError('invalid_category')
  }
}
function text(value: unknown, max: number): string | null {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= max
    ? value.trim()
    : null
}
function optionalToken(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= 32 &&
    /^[a-z0-9-]+$/i.test(value)
    ? value.trim()
    : undefined
}
function categoryId(context: CategoryContext): string {
  const value = context.req.param('categoryId')
  if (value === undefined || value.length === 0 || value.length > 128)
    throw new CategoryError('invalid_category')
  return value
}
function transactionId(context: CategoryContext): string {
  const value = context.req.param('transactionId')
  if (value === undefined || value.length === 0 || value.length > 128)
    throw new CategoryError('invalid_category')
  return value
}
function sourceCode(context: CategoryContext): string {
  const value = context.req.param('sourceCode')
  if (value === undefined || value.length === 0 || value.length > 128)
    throw new CategoryError('invalid_category')
  return value
}
function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
