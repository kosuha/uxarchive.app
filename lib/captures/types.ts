export type CaptureRecord = {
  id: string
  pattern_id: string
  storage_path: string
  media_type: string
  mime_type: string
  order_index: number
  created_at: string
  width?: number | null
  height?: number | null
  poster_storage_path?: string | null
  public_url?: string | null
}
