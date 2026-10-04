import { useState } from 'react'
import FormDaftar from '../components/FormDaftar'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
export default function TambahNasabah() {
  const { koperasi } = useAuth(), toast = useToast(), [k, setK] = useState(0)
  return <div className="space-y-4"><h1 className="text-2xl font-extrabold">Tambah Nasabah</h1><p className="text-sm text-slate-500">Isi sama seperti pendaftaran. Admin akan mengecek data & foto sebelum nasabah aktif.</p>
    <div className="card"><FormDaftar key={k} role="nasabah" kode={koperasi?.kode_unik} onDone={() => { toast.success('Nasabah terkirim', 'Menunggu persetujuan admin.'); setK(k + 1) }} /></div></div>
}
