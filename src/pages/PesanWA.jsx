import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { waLink, rp, tgl } from '../lib/utils'
const TPL = {
  promo: ['🎉 Promo', 'Halo *[Nama]* 👋\n\n🎉 *PROMO PINJAMAN [Koperasi]*\nCair cepat, syarat mudah, cicilan ringan & transparan 💚\n\n{tabel}\n✅ Proses cepat\n✅ Tanpa ribet\n✅ Bayar via QRIS / Transfer / Tunai\n\nYuk ajukan sekarang 👇\n{link}'],
  sapa: ['🤝 Sapaan', 'Halo *[Nama]* 😊\n\nTerima kasih sudah menjadi bagian dari keluarga *[Koperasi]*. Butuh tambahan modal usaha? Kami siap membantu dengan cicilan yang ringan.\n\n{tabel}\nInfo lengkap & harga terbaru:\n{link}'],
  ingat: ['🔔 Pengingat', 'Halo *[Nama]* 🙏\n\nPengingat ramah dari *[Koperasi]*: angsuran Anda segera jatuh tempo. Bayar tepat waktu supaya bebas denda ya 💚\n\nBayar mudah lewat QRIS di aplikasi:\n{link}'],
  terima: ['💚 Terima kasih', 'Halo *[Nama]* 💚\n\nTerima kasih sudah membayar tepat waktu! Anda nasabah yang luar biasa 🌟\nNantikan penawaran spesial dari *[Koperasi]* untuk Anda.\n\n{link}'],
}
const bold = (t) => t.split(/(\*[^*]+\*)/).map((s, i) => s.startsWith('*') && s.endsWith('*') && s.length > 2 ? <b key={i}>{s.slice(1, -1)}</b> : s)
export default function PesanWA() {
  const { koperasi } = useAuth(), toast = useToast()
  const [late, setLate] = useState([]), [all, setAll] = useState([]), [tabel, setTabel] = useState([]), [t, setT] = useState('promo'), [mode, setMode] = useState('hari'), [q, setQ] = useState(''), [sent, setSent] = useState({})
  useEffect(() => { (async () => {
    const hari = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('angsuran').select('*, nasabah:profiles!angsuran_nasabah_id_fkey(nama,no_hp)').eq('status', 'belum').lt('jatuh_tempo', hari); setLate(data || [])
    const { data: n } = await supabase.from('profiles').select('id,nama,no_hp').eq('role', 'nasabah').eq('status', 'approved').not('no_hp', 'is', null); setAll(n || [])
    const { data: ta } = await supabase.from('tabel_angsuran').select('*'); setTabel((ta || []).filter(x => x.cicilan * x.tenor >= x.pokok)) })() }, [])
  const blok = (j) => { const R = tabel.filter(x => x.jenis === j); if (!R.length) return ''
    const pk = [...new Set(R.map(x => +x.pokok))].sort((a, b) => a - b), u = j === 'hari' ? 'hr' : 'bln'
    return `${j === 'hari' ? '📅 *Cicilan Harian*' : '🗓️ *Cicilan Bulanan*'}\n` + pk.map(p => `▫️ *${rp(p)}* → ` + R.filter(x => +x.pokok === p).sort((a, b) => a.tenor - b.tenor).map(x => `${x.tenor}${u} ${rp(x.cicilan)}`).join(' • ')).join('\n') + '\n' }
  const tbl = mode === 'none' ? '' : (mode === 'both' ? blok('hari') + '\n' + blok('bulan') : blok(mode)) + '\n'
  const link = location.href.split('#')[0] + '#/produk'
  const base = TPL[t][1].replace('{tabel}', t === 'ingat' || t === 'terima' ? '' : tbl).replaceAll('{link}', link).replaceAll('[Koperasi]', koperasi?.nama || 'kami')
  const msg = (nama) => base.replaceAll('[Nama]', nama)
  const list = all.filter(n => n.nama.toLowerCase().includes(q.toLowerCase()))
  const tagih = (a) => `Halo *${a.nasabah?.nama}* 🙏\n\nKami dari *${koperasi?.nama || 'Koperasi'}* mengingatkan angsuran Anda:\n🧾 Angsuran ke-${a.ke}\n💰 Tagihan: *${rp(+a.jumlah + +a.denda)}*\n📅 Jatuh tempo: ${tgl(a.jatuh_tempo)}\n\nMohon segera bayar via QRIS/transfer di aplikasi atau hubungi kami. Terima kasih 💚`
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Pesan WhatsApp</h1>
    <div className="card space-y-2"><h2 className="font-bold">🔔 Tagihan terlambat</h2>{late.map(a => <div key={a.id} className="flex justify-between items-center gap-2 py-2 border-t text-sm"><span>{a.nasabah?.nama}<br /><span className="text-slate-500">{rp(+a.jumlah + +a.denda)} · {tgl(a.jatuh_tempo)}</span></span>
      <a className="btn !py-2" target="_blank" href={waLink(a.nasabah?.no_hp, tagih(a))}>Tagih via WA</a></div>)}{late.length === 0 && <p className="text-sm text-slate-500">Tidak ada tagihan terlambat.</p>}</div>
    <div className="card space-y-3"><h2 className="font-bold">📣 Pesan marketing</h2>
      <div className="flex flex-wrap gap-2">{Object.entries(TPL).map(([k, v]) => <button key={k} onClick={() => setT(k)} className={`px-3 py-2 rounded-xl text-sm font-bold border ${t === k ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200'}`}>{v[0]}</button>)}</div>
      {(t === 'promo' || t === 'sapa') && <div><label className="lbl">Sertakan tabel angsuran</label><div className="flex flex-wrap gap-2">{[['hari', 'Harian'], ['bulan', 'Bulanan'], ['both', 'Keduanya'], ['none', 'Tanpa']].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${mode === k ? 'bg-ink text-white border-ink' : 'bg-white border-slate-200'}`}>{l}</button>)}</div></div>}
      <div><label className="lbl">Pratinjau</label><div className="rounded-2xl rounded-tl-sm bg-[#DCF8C6] p-3 text-sm whitespace-pre-wrap break-words max-h-80 overflow-y-auto">{bold(msg('Budi'))}</div></div>
      <button className="btn2" onClick={() => { navigator.clipboard?.writeText(msg('Kak')); toast.success('Pesan disalin') }}>📋 Salin pesan</button>
      <input className="inp" placeholder="Cari nasabah…" value={q} onChange={e => setQ(e.target.value)} />
      {list.map(n => <div key={n.id} className="flex items-center justify-between gap-2 border-t pt-2 text-sm"><span>{n.nama}<br /><span className="text-xs text-slate-500">{n.no_hp}</span></span>
        <a target="_blank" className={sent[n.id] ? 'btn2 !py-2' : 'btn !py-2'} onClick={() => setSent({ ...sent, [n.id]: 1 })} href={waLink(n.no_hp, msg(n.nama))}>{sent[n.id] ? '✓ Terkirim' : 'Kirim WA'}</a></div>)}
      {list.length === 0 && <p className="text-sm text-slate-500">Tidak ada nasabah dengan No HP.</p>}</div></div>
}
