import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { rp, digits } from '../lib/utils'
export default function TabelAngsuran() {
  const { profile } = useAuth(), toast = useToast(), kid = profile.koperasi_id
  const [rows, setRows] = useState([]), [jenis, setJenis] = useState('hari'), [xp, setXp] = useState([]), [xt, setXt] = useState([]), [np, setNp] = useState(''), [nt, setNt] = useState('')
  const load = async () => { const { data } = await supabase.from('tabel_angsuran').select('*').eq('koperasi_id', kid); setRows(data || []) }
  useEffect(() => { load() }, [])
  const R = rows.filter(r => r.jenis === jenis), uniq = (a) => [...new Set(a)].sort((x, y) => x - y)
  const pokoks = uniq([...R.map(r => +r.pokok), ...xp]), tenors = uniq([...R.map(r => r.tenor), ...xt])
  const cell = (p, t) => R.find(r => +r.pokok === p && r.tenor === t)
  const save = async (p, t, v) => {
    const n = +digits(v, 9), c = cell(p, t); if ((c?.cicilan || 0) === n) return
    const { error } = n ? await supabase.from('tabel_angsuran').upsert({ koperasi_id: kid, jenis, pokok: p, tenor: t, cicilan: n }, { onConflict: 'koperasi_id,jenis,pokok,tenor' }) : c ? await supabase.from('tabel_angsuran').delete().eq('id', c.id) : {}
    error ? toast.error('Gagal menyimpan', error.message) : toast.success('Tarif tersimpan'); load()
  }
  const bad = R.filter(r => r.cicilan * r.tenor < r.pokok).length
  return <div className="card space-y-3"><div className="flex items-center justify-between gap-2"><h2 className="font-bold">Tabel angsuran</h2>
    <button className="btn2" onClick={async () => { const { error } = await supabase.rpc('isi_tabel_angsuran', { p_kop: kid }); error ? toast.error('Gagal', error.message) : toast.success('Tabel standar dimuat'); load() }}>Muat tabel standar</button></div>
    <div className="flex rounded-2xl bg-slate-100 p-1 w-fit">{['hari', 'bulan'].map(s => <button key={s} onClick={() => setJenis(s)} className={`px-4 py-1.5 rounded-xl text-sm font-bold ${jenis === s ? 'bg-white shadow text-brand-dark' : 'text-slate-500'}`}>{s === 'hari' ? 'Harian' : 'Bulanan'}</button>)}</div>
    {bad > 0 && <p className="text-xs text-red-600">⚠ {bad} tarif bertanda merah: total bayar lebih kecil dari pokok. Mohon periksa.</p>}
    <p className="text-xs text-slate-500">Isi cicilan per {jenis} (Rp). Kosongkan kotak untuk menghapus pilihan tenor itu.</p>
    <div className="overflow-x-auto"><table className="text-xs"><thead><tr><th className="p-1 text-left">Pokok \ Tenor</th>{tenors.map(t => <th key={t} className="p-1">{t} {jenis}</th>)}</tr></thead>
      <tbody>{pokoks.map(p => <tr key={p}><td className="p-1 font-bold whitespace-nowrap">{rp(p)}</td>{tenors.map(t => { const c = cell(p, t), merah = c && c.cicilan * t < p
        return <td key={t} className="p-1"><input inputMode="numeric" key={`${p}-${t}-${c?.cicilan || 0}`} defaultValue={c?.cicilan || ''} onBlur={e => save(p, t, e.target.value)} className={`w-24 rounded-lg border px-2 py-1.5 ${merah ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} /></td> })}</tr>)}</tbody></table></div>
    <div className="flex gap-2"><input className="inp" inputMode="numeric" placeholder="Tambah pokok (Rp)" value={np} onChange={e => setNp(digits(e.target.value, 9))} /><button className="btn2" onClick={() => { np && setXp([...xp, +np]); setNp('') }}>+ Pokok</button></div>
    <div className="flex gap-2"><input className="inp" inputMode="numeric" placeholder={`Tambah tenor (${jenis})`} value={nt} onChange={e => setNt(digits(e.target.value, 3))} /><button className="btn2" onClick={() => { nt && setXt([...xt, +nt]); setNt('') }}>+ Tenor</button></div></div>
}
