// Ambient declarations for backend execution runtime.
// Provided by installBackendGlobals() in nodeRuntime.ts.

declare type User = {
  fullName: string
  email: string
}

declare type MultipartFormDataEntry =
  | { key: string; value: string }
  | { key: string; file: string; filename: string }
  | { key: string; fileUrl: string; filename: string; fileSize: number; contentType: string }

// Backward compatibility alias during migration
declare type RetoolFormDataEntry = MultipartFormDataEntry

declare const n8nFinancialAgent: {
  rawRequest<T>(options: {
    path: string
    method?: string
    bodyType?: 'form-data' | 'json'
    formData?: MultipartFormDataEntry[]
    json?: Record<string, unknown> | unknown
    body?: any
  }): Promise<{ data: T }>
}

declare const retoolDb: {
  query<T>(sql: string): Promise<{ data: T[] }>
}

declare const __APP_BUILD_INFO__: {
  commit: string
  builtAt: string
}
