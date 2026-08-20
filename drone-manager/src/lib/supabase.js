import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env — ver README.md'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Buckets de Storage usados na aplicação
export const BUCKETS = {
  DOCUMENTS: 'documents',
  PHOTOS: 'photos',
  LOGS: 'logs',
}

// Helper: upload de ficheiro para um bucket, devolve o path público assinado
export async function uploadFile(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Helper: upload para um bucket PRIVADO (ex: logs). Devolve apenas o path,
// não um URL público — o bucket "logs" não é acessível diretamente.
export async function uploadPrivateFile(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  return path
}

// Invoca a Edge Function que decifra e processa um log DJI já enviado
export async function processDjiLog(missionId) {
  const { data, error } = await supabase.functions.invoke('process-dji-log', {
    body: { mission_id: missionId },
  })
  if (error) throw error
  return data
}
