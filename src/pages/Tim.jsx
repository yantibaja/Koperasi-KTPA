import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export default function Tim() {
  const [rows, setRows] = useState([]); const load = async () => { const { data } = await supabase.from('profiles').select('*, penagih_detail(area)').eq('role', 'penagih').eq('status', 'approved'); setRows(data || []) }
  useEffect(() => { load() }, [])
  const area = async (id, v) => { await supabase.from('penagih_detail').update({ area: v }).eq('id', id) }
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Kelola Tim Penagih</h1>
    {rows.map(p => <div key={p.id} className="card flex items-center gap-3"><div className="flex-1"><b>{p.nama}</b><div className="text-xs text-slate-500">{p.no_hp}</div></div>
      <input className="inp max-w-[10rem]" placeholder="Area tagih" defaultValue={p.penagih_detail?.area || ''} onBlur={e => area(p.id, e.target.value)} />
      <button className="btn2" onClick={async () => { await supabase.from('profiles').update({ status_blokir: true }).eq('id', p.id); load() }}>Nonaktifkan</button></div>)}
    {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada penagih. Mereka mendaftar sendiri memakai kode koperasi, lalu Anda setujui di menu Persetujuan.</p>}</div>
}
