import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
const C = createContext({ wajib: false, siap: true, galat: false, masuk: null, pulang: null, muat() {} })
export const useAbsensi = () => useContext(C)
// Awal hari WITA (UTC+8), sama dengan aturan di database
export const awalHariWita = () => { const t = new Date(Date.now() + 8 * 3600e3); t.setUTCHours(0, 0, 0, 0); return new Date(t.getTime() - 8 * 3600e3).toISOString() }
export function AbsensiProvider({ children }) {
  const { profile } = useAuth(), wajib = !!profile && ['admin', 'penagih'].includes(profile.role) && profile.status === 'approved'
  const [d, setD] = useState({ siap: false, galat: false, masuk: null, pulang: null })
  const muat = useCallback(async () => {
    if (!wajib) return setD({ siap: true, galat: false, masuk: null, pulang: null })
    const { data, error } = await supabase.from('absensi').select('jenis,waktu').eq('user_id', profile.id).gte('waktu', awalHariWita())
    // Bila tabel belum dibuat (SQL belum dijalankan), aplikasi tidak dikunci
    if (error) return setD({ siap: true, galat: true, masuk: null, pulang: null })
    setD({ siap: true, galat: false, masuk: data?.find(x => x.jenis === 'masuk')?.waktu || null, pulang: data?.find(x => x.jenis === 'pulang')?.waktu || null })
  }, [profile?.id, wajib])
  useEffect(() => { setD(x => ({ ...x, siap: !wajib })); muat() }, [profile?.id, wajib])
  return <C.Provider value={{ wajib, ...d, muat }}>{children}</C.Provider>
}
