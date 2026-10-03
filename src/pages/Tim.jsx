import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rp, tgl } from '../lib/utils'
export default function Tim() {
  const [rows, setRows] = useState([]), [tugas, setTugas] = useState([]), [msg, setMsg] = useState('')
  const load = async () => {
    const { data } = await supabase.from('profiles').select('*, penagih_detail(area)').eq('role', 'penagih').eq('status', 'approved'); setRows(data || [])
    const { data: t } = await supabase.from('tugas_tagih').select('*, angsuran(jumlah,denda,jatuh_tempo,nasabah:profiles!angsuran_nasabah_id_fkey(nama))').neq('status', 'selesai'); setTugas(t || [])
  }
  useEffect(() => { load() }, [])
  const area = async (id, v) => { await supabase.from('penagih_detail').update({ area: v }).eq('id', id) }
  const assign = async (id, pid) => { await supabase.from('tugas_tagih').update({ penagih_id: pid || null }).eq('id', id); load() }
  const cek = async () => { setMsg('Memeriksa…'); const { data, error } = await supabase.functions.invoke('cek-tunggakan'); setMsg(error ? error.message : `Tugas baru: ${data?.tugas_dibuat ?? 0}`); load() }
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Kelola Tim Penagih</h1>
    {rows.map(p => <div key={p.id} className="card flex items-center gap-3 flex-wrap"><div className="flex-1"><b>{p.nama}</b><div className="text-xs text-slate-500">{p.no_hp}{p.status_blokir && ' · nonaktif'}</div></div>
      <input className="inp max-w-[10rem]" placeholder="Area tagih" defaultValue={p.penagih_detail?.area || ''} onBlur={e => area(p.id, e.target.value)} />
      <button className="btn2" onClick={async () => { await supabase.from('profiles').update({ status_blokir: !p.status_blokir }).eq('id', p.id); load() }}>{p.status_blokir ? 'Aktifkan' : 'Nonaktifkan'}</button></div>)}
    {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada penagih. Mereka mendaftar dengan kode koperasi, lalu disetujui di menu Persetujuan.</p>}
    <div className="card space-y-2"><div className="flex justify-between items-center"><h2 className="font-bold">Tugas tagih ({tugas.length})</h2><button className="btn2" onClick={cek}>Cek tunggakan sekarang</button></div>
      {msg && <p className="text-xs text-slate-500">{msg}</p>}
      {tugas.map(t => <div key={t.id} className="flex items-center justify-between gap-2 border-t pt-2 text-sm"><span>{t.angsuran?.nasabah?.nama}<br /><span className="text-slate-500">{rp(+t.angsuran?.jumlah + +t.angsuran?.denda)} · {tgl(t.angsuran?.jatuh_tempo)}</span></span>
        <select className="inp max-w-[10rem]" value={t.penagih_id || ''} onChange={e => assign(t.id, e.target.value)}><option value="">Belum ditugaskan</option>{rows.filter(p => !p.status_blokir).map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}</select></div>)}
      {tugas.length === 0 && <p className="text-sm text-slate-500">Belum ada tugas tagih.</p>}</div></div>
}
