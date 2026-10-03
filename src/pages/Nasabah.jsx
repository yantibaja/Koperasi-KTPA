import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
export default function Nasabah() {
  const { profile } = useAuth(); const [rows, setRows] = useState([])
  const load = async () => { const { data } = await supabase.from('profiles').select('*').eq('role', 'nasabah').eq('status', 'approved').order('nama'); setRows(data || []) }
  useEffect(() => { load() }, [])
  const blokir = async (p) => {
    const b = !p.status_blokir
    await supabase.from('profiles').update({ status_blokir: b }).eq('id', p.id)
    if (b) await supabase.from('blocked_list').upsert([{ koperasi_id: p.koperasi_id, tipe: 'NIK', nilai: p.nik }, ...(p.no_hp ? [{ koperasi_id: p.koperasi_id, tipe: 'HP', nilai: p.no_hp }] : [])], { onConflict: 'tipe,nilai' })
    else await supabase.from('blocked_list').delete().or(`nilai.eq.${p.nik},nilai.eq.${p.no_hp || 'x'}`)
    load()
  }
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Nasabah</h1>
    {rows.map(p => <div key={p.id} className="card flex items-center justify-between gap-3"><div><div className="font-bold">{p.nama}</div><div className="text-xs text-slate-500">NIK {p.nik} · {p.no_hp || '-'}</div><div className="text-xs text-slate-500">{p.alamat}</div></div>
      <button className={p.status_blokir ? 'btn' : 'btn2'} onClick={() => blokir(p)}>{p.status_blokir ? 'Buka blokir' : 'Blokir'}</button></div>)}
    {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada nasabah. Bagikan kode koperasi dari menu Pengaturan agar nasabah bisa mendaftar.</p>}</div>
}
