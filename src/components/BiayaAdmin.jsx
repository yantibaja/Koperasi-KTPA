import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
export default function BiayaAdmin() {
  const { profile } = useAuth(), toast = useToast(), kid = profile.koperasi_id, [p, setP] = useState('5')
  useEffect(() => { supabase.from('biaya_admin').select('persen').eq('koperasi_id', kid).maybeSingle().then(({ data }) => data && setP(String(data.persen))) }, [])
  return <div className="card space-y-2"><div className="flex items-center justify-between"><h2 className="font-bold">Biaya admin</h2><span className="text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-1 font-bold">Hanya pemilik</span></div>
    <p className="text-xs text-slate-500">Tidak terlihat oleh penagih dan nasabah. Dipotong dari dana cair.</p>
    <label className="lbl">Persen dari pinjaman</label><input type="number" step="0.5" min="0" max="100" className="inp" value={p} onChange={e => setP(e.target.value)} />
    <button className="btn" onClick={async () => { const { error } = await supabase.from('biaya_admin').upsert({ koperasi_id: kid, persen: +p || 0 }); error ? toast.error('Gagal', error.message) : toast.success('Biaya admin tersimpan') }}>Simpan</button></div>
}
