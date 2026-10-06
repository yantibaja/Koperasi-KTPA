import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export default function Koperasi() {
  const [rows, setRows] = useState([]); const load = async () => { const { data } = await supabase.from('koperasi').select('*').order('created_at', { ascending: false }); setRows(data || []) }
  useEffect(() => { load() }, [])
  const set = async (id, status) => { await supabase.from('koperasi').update({ status }).eq('id', id); load() }
  return <div className="space-y-4"><h1 className="judul">Semua Koperasi</h1>
    {rows.map(k => <div key={k.id} className="card flex items-center justify-between gap-3"><div><b>{k.nama}</b> <span className="text-xs text-slate-500">· {k.kode_unik}</span><div className="text-xs text-slate-500">{k.nama_pemilik} · {k.telp} · {k.alamat}</div><div className="text-xs">Status: {k.status}</div></div>
      {k.status === 'approved' ? <button className="btn2" onClick={() => set(k.id, 'rejected')}>Nonaktifkan</button> : <button className="btn" onClick={() => set(k.id, 'approved')}>Aktifkan</button>}</div>)}
    {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada koperasi.</p>}</div>
}
