export interface ApiSuccess<T> {
  data: T
}

export interface ApiFailure {
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
