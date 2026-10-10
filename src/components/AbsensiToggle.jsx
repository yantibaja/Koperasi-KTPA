import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { supabase } from '../lib/supabase'
export default function AbsensiToggle() {
  const { profile, koperasi, setKoperasi } = useAuth(), toast = useToast(), on = koperasi?.absensi_wajib !== false
  const ubah = async () => { const { error } = await supabase.from('koperasi').update({ absensi_wajib: !on }).eq('id', profile.koperasi_id); if (error) return toast.error('Gagal', error.message); setKoperasi({ ...koperasi, absensi_wajib: !on }); toast.success(!on ? 'Absensi wajib diaktifkan' : 'Absensi wajib dimatikan') }
  return <div className="card flex items-center justify-between gap-3"><div><h2 className="font-bold">📸 Absensi wajib</h2><p className="text-xs text-slate-500">Penagih dan pemilik harus absen masuk (foto + lokasi) sebelum memakai aplikasi.</p></div>
    <button onClick={ubah} className={`w-14 h-8 rounded-full p-1 transition shrink-0 ${on ? 'bg-gradient-to-r from-brand to-fuchsia-500' : 'bg-slate-300'}`}><span className={`block w-6 h-6 rounded-full bg-white shadow transition ${on ? 'translate-x-6' : ''}`} /></button></div>
}
