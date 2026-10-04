import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export default function Foto({ bucket, path, l }) {
  const [u, setU] = useState(), [bad, setBad] = useState(false)
  useEffect(() => { path && supabase.storage.from(bucket).createSignedUrl(path, 900).then(({ data }) => setU(data?.signedUrl)) }, [path])
  if (!path) return null
  return <a href={u} target="_blank" rel="noreferrer" className="block text-center text-[11px] text-slate-500 w-24">
    {u && !bad ? <img src={u} onError={() => setBad(true)} className="h-24 w-24 rounded-xl object-cover border" /> : <div className="h-24 w-24 rounded-xl border bg-slate-50 grid place-items-center text-2xl">📄</div>}{l}</a>
}
