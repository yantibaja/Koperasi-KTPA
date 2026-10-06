import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useConfirm } from '../lib/confirm'
import { Link } from 'react-router-dom'
import { rp, tgl } from '../lib/utils'
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const jatuhTempo = (i, satuan) => {
  const n = new Date(); if (satuan === 'hari') return ymd(new Date(n.getFullYear(), n.getMonth(), n.getDate() + i + 1))
  if (satuan === 'minggu') return ymd(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 7 * (i + 1)))
  const t = new Date(n.getFullYear(), n.getMonth() + i + 1, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(n.getDate(), last)); return ymd(t)
}
const F0 = { nasabah_id: '', satuan: 'hari', pokok: 0, tenor: 0 }
export default function Pinjaman() {
  const { profile } = useAuth(), toast = useToast(), ask = useConfirm(), admin = profile.role !== 'nasabah'
  const [rows, setRows] = useState([]), [nas, setNas] = useState([]), [tabel, setTabel] = useState([]), [kops, setKops] = useState([]), [admMap, setAdmMap] = useState({}), [f, setF] = useState(F0), [edit, setEdit] = useState(null), [show, setShow] = useState(null)
  const load = async () => {
    const { data } = await supabase.from('pinjaman').select('*, nasabah:profiles(nama), angsuran(*)').order('created_at', { ascending: false }); setRows(data || [])
    if (admin) { const { data: n } = await supabase.from('profiles').select('id,nama,koperasi_id').eq('role', 'nasabah').eq('status', 'approved'); setNas(n || []); const { data: t } = await supabase.from('tabel_angsuran').select('*'); setTabel(t || []); const { data: ko } = await supabase.from('biaya_admin').select('koperasi_id,persen'); setKops(ko || []); const { data: pa } = await supabase.from('pinjaman_admin').select('pinjaman_id,admin_rp'); setAdmMap(Object.fromEntries((pa || []).map(x => [x.pinjaman_id, x.admin_rp]))) }
  }
  useEffect(() => { load() }, [])
  const kid = nas.find(n => n.id === f.nasabah_id)?.koperasi_id || profile.koperasi_id
  const T = tabel.filter(t => t.koperasi_id === kid && t.jenis === f.satuan), uniq = a => [...new Set(a)].sort((x, y) => x - y)
  const pokoks = uniq(T.map(t => +t.pokok)), tenors = uniq(T.filter(t => +t.pokok === f.pokok).map(t => t.tenor))
  const cicilan = +T.find(t => +t.pokok === f.pokok && t.tenor === f.tenor)?.cicilan || 0, total = cicilan * f.tenor, admPct = +kops.find(k => k.koperasi_id === kid)?.persen || 0, adm = Math.round(f.pokok * admPct / 100)
  const batal = () => { setEdit(null); setF(F0) }
  const mulaiEdit = (p) => { setEdit(p); setF({ nasabah_id: p.nasabah_id, satuan: p.satuan_tenor || 'bulan', pokok: +p.pokok, tenor: p.tenor }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const buatAngsuran = (pid) => supabase.from('angsuran').insert(Array.from({ length: f.tenor }, (_, i) => ({ pinjaman_id: pid, koperasi_id: kid, nasabah_id: f.nasabah_id, ke: i + 1, jumlah: cicilan, jatuh_tempo: jatuhTempo(i, f.satuan) })))
  const simpan = async () => {
    if (!f.nasabah_id) return toast.info('Pilih nasabah dulu'); if (!cicilan) return toast.info('Pilih pokok dan tenor')
    if (total < f.pokok) return toast.error('Tarif tidak wajar', 'Total bayar lebih kecil dari pokok. Perbaiki di Pengaturan → Tabel angsuran.')
    const data = { pokok: f.pokok, bunga_rp: Math.round(cicilan - f.pokok / f.tenor), bunga_persen: 0, tenor: f.tenor, satuan_tenor: f.satuan }
    if (edit) {
      if (edit.angsuran?.some(a => a.status === 'lunas')) return toast.error('Tidak bisa diubah', 'Sudah ada angsuran lunas. Anda hanya bisa mengubah status pinjaman.')
      const { error } = await supabase.from('pinjaman').update(data).eq('id', edit.id); if (error) return toast.error('Gagal menyimpan', error.message)
      await supabase.from('angsuran').delete().eq('pinjaman_id', edit.id)
      const { error: e2 } = await buatAngsuran(edit.id); if (e2) return toast.error('Angsuran gagal dibuat', e2.message)
      await supabase.from('pinjaman_admin').upsert({ pinjaman_id: edit.id, koperasi_id: kid, admin_rp: adm }); toast.success('Pinjaman diperbarui', 'Jadwal angsuran dibuat ulang'); batal(); return load()
    }
    const { data: p, error } = await supabase.from('pinjaman').insert({ koperasi_id: kid, nasabah_id: f.nasabah_id, ...data }).select().single(); if (error) return toast.error('Gagal menyimpan', error.message)
    const { error: e2 } = await buatAngsuran(p.id); if (e2) return toast.error('Angsuran gagal dibuat', e2.message)
    await supabase.from('pinjaman_admin').upsert({ pinjaman_id: p.id, koperasi_id: kid, admin_rp: adm }); toast.success('Pinjaman tersimpan', `${f.tenor} angsuran ${f.satuan === 'hari' ? 'harian' : 'bulanan'} dibuat`); setF({ ...f, pokok: 0, tenor: 0 }); load()
  }
  const hapus = async (p) => {
    if (!await ask({ title: 'Hapus pinjaman?', text: `Pinjaman ${p.nasabah?.nama} sebesar ${rp(p.pokok)} beserta seluruh angsuran dan riwayat pembayarannya dihapus permanen.`, ok: 'Hapus', danger: true })) return
    const { data, error } = await supabase.from('pinjaman').delete().eq('id', p.id).select()
    if (error) return toast.error('Gagal menghapus', error.message); if (!data?.length) return toast.error('Tidak bisa dihapus', 'Anda tidak memiliki izin.')
    toast.success('Pinjaman dihapus'); if (edit?.id === p.id) batal(); load()
  }
  const status = async (p, s) => { const { error } = await supabase.from('pinjaman').update({ status: s }).eq('id', p.id); error ? toast.error('Gagal', error.message) : toast.success('Status diubah'); load() }
  const chip = (on, onClick, t) => <button key={t} onClick={onClick} className={`px-3 py-2 rounded-xl text-sm font-bold border ${on ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200'}`}>{t}</button>
  return <div className="space-y-4"><h1 className="judul">Pinjaman</h1>
    {admin && <div className="card space-y-3"><div className="flex justify-between items-center"><h2 className="font-bold">{edit ? `Edit pinjaman · ${edit.nasabah?.nama}` : 'Pinjaman baru'}</h2>{edit && <button className="btn2 !py-1.5" onClick={batal}>Batal</button>}</div>
      <select disabled={!!edit} className="inp" value={f.nasabah_id} onChange={e => setF({ ...f, nasabah_id: e.target.value, pokok: 0, tenor: 0 })}><option value="">Pilih nasabah</option>{nas.map(n => <option key={n.id} value={n.id}>{n.nama}</option>)}</select>
      <div className="flex rounded-2xl bg-slate-100 p-1">{['hari', 'minggu'].map(s => <button key={s} onClick={() => setF({ ...f, satuan: s, pokok: 0, tenor: 0 })} className={`flex-1 py-2 rounded-xl text-sm font-bold ${f.satuan === s ? 'bg-white shadow text-brand-dark' : 'text-slate-500'}`}>{{ hari: 'Harian', minggu: 'Mingguan', bulan: 'Bulanan' }[s]}</button>)}</div>
      {pokoks.length === 0 && <p className="text-sm text-slate-500">Tabel angsuran belum ada. Buka Pengaturan → Tabel angsuran → Muat tabel standar.</p>}
      <div><label className="lbl">Jumlah pinjaman</label><div className="flex flex-wrap gap-2">{pokoks.map(p => chip(f.pokok === p, () => setF({ ...f, pokok: p, tenor: 0 }), rp(p)))}</div></div>
      {f.pokok > 0 && <div><label className="lbl">Tenor ({f.satuan === 'hari' ? 'hari' : 'minggu'})</label><div className="flex flex-wrap gap-2">{tenors.map(t => chip(f.tenor === t, () => setF({ ...f, tenor: t }), `${t}`))}</div></div>}
      {cicilan > 0 && <div className="bg-brand-soft rounded-2xl p-3 text-sm space-y-0.5"><div>Cicilan: <b>{rp(cicilan)}</b> per {f.satuan} × {f.tenor}</div><div>Total bayar: <b>{rp(total)}</b> · Bunga: {rp(total - f.pokok)}</div><div>{admPct > 0 ? `Admin ${admPct}%: ${rp(adm)} · Dana cair: ` : 'Tanpa biaya admin · Dana cair: '}<b>{rp(f.pokok - adm)}</b></div></div>}
      <button className="btn" onClick={simpan}>{edit ? 'Simpan perubahan' : 'Simpan pinjaman'}</button></div>}
    {rows.map(p => { const L = (p.angsuran || []).sort((a, b) => a.ke - b.ke), all = show === p.id, lunas = L.filter(a => a.status === 'lunas').length
      return <div key={p.id} className="card space-y-2"><div className="flex justify-between gap-2"><b>{p.nasabah?.nama}</b><b>{rp(p.pokok)}</b></div>
        <div className="text-xs text-slate-500">Cicilan {rp(L[0]?.jumlah)}/{p.satuan_tenor || 'bulan'} · {p.tenor} {p.satuan_tenor || 'bulan'} · lunas {lunas}/{L.length}{+admMap[p.id] > 0 && ` · admin ${rp(admMap[p.id])}`}</div>
        {admin && <div className="flex flex-wrap gap-2 items-center"><Link to={`/bukti?id=${p.id}`} className="btn2 !py-1.5">Cetak bukti</Link><button className="btn2 !py-1.5" onClick={() => mulaiEdit(p)}>Edit</button><button className="btn2 !py-1.5 !text-rose-600" onClick={() => hapus(p)}>Hapus</button>
          <select className="inp !w-auto !py-1.5" value={p.status} onChange={e => status(p, e.target.value)}><option value="aktif">Aktif</option><option value="lunas">Lunas</option><option value="batal">Batal</option></select></div>}
        {(all ? L : L.slice(0, 3)).map(a => <div key={a.id} className="flex justify-between text-sm py-1 border-t"><span>#{a.ke} · {tgl(a.jatuh_tempo)}</span><span className={a.status === 'lunas' ? 'text-brand' : ''}>{rp(+a.jumlah + +a.denda)} {a.status === 'lunas' ? '✓' : ''}</span></div>)}
        {L.length > 3 && <button className="text-xs font-bold text-brand-dark" onClick={() => setShow(all ? null : p.id)}>{all ? 'Sembunyikan' : `Lihat semua ${L.length} angsuran`}</button>}</div> })}</div>
}
