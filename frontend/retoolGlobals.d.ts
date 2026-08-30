// Ambient declarations for the globals Retool injects into backend functions.
// Outside Retool they are provided by installRetoolGlobals() in retoolRuntime.ts.
// Declaring them lets /backend/diligence typecheck under the strict local tsconfig.

declare type User = {
  fullName: string
  email: string
}

declare type RetoolFormDataEntry =
  | { key: string; value: string }
  | { key: string; file: string; filename: string }
  | { key: string; fileUrl: string; filename: string; fileSize: number; contentType: string }

declare const n8nFinancialAgent: {
  rawRequest<T>(options: {
    path: string
    method?: string
    bodyType?: 'form-data' | 'json'
    formData?: RetoolFormDataEntry[]
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
