import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const client = await createClient()
  await client.auth.signOut()
  redirect('/login')
}
