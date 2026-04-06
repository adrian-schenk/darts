export type FormKitContextLike = {
  _value?: unknown
  attrs?: Record<string, unknown>
  node?: {
    props?: Record<string, unknown>
    value?: Record<string, unknown>
    input: (value: any) => void
  }
}
