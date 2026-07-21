import { createClient } from './client'

export type BucketName = 'menu-images' | 'room-images' | 'gallery' | 'avatars' | 'staff' | 'documents' | 'events'

export async function uploadFile(
  bucket: BucketName,
  file: File,
  folder?: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createClient()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExtension}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { url: null, error: uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return { url: publicUrl, error: null }
  } catch (err: any) {
    console.error('Storage upload exception:', err)
    return { url: null, error: err.message || 'Unknown error occurred during upload' }
  }
}
