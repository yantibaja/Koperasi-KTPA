import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null), [koperasi, setKoperasi] = useState(null), [loading, setLoading] = useState(true)
  const load = async (session) => {
    if (!session) { setProfile(null); setKoperasi(null); return setLoading(false) }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (p?.status_blokir) { await supabase.auth.signOut(); return setLoading(false) }
    setProfile(p)
    if (p?.koperasi_id) { const { data: k } = await supabase.from('koperasi').select('*').eq('id', p.koperasi_id).single(); setKoperasi(k) }
    setLoading(false)
  }
  useEffect(() => {
    // PENTING: jangan await query Supabase langsung di dalam callback ini (menyebabkan macet/deadlock), tunda dengan setTimeout
    const { data: s } = supabase.auth.onAuthStateChange((_e, session) => { setTimeout(() => load(session), 0) })
    return () => s.subscription.unsubscribe()
  }, [])
  return <Ctx.Provider value={{ profile, koperasi, loading, setKoperasi, logout: () => supabase.auth.signOut() }}>{children}</Ctx.Provider>
}
