export interface ApiSuccess<T> {
  data: T
}

export interface ApiFailure {
  error: {
    code: string
    message: string
  }
}

export function success<T>(data: T): ApiSuccess<T> {
  return { data }
}

export function failure(code: string, message: string): ApiFailure {
  return { error: { code, message } }
}
