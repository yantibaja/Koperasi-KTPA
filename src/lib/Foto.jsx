import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export default function Foto({ bucket, path, l }) {
  const [u, setU] = useState()
  useEffect(() => { path && supabase.storage.from(bucket).createSignedUrl(path, 600).then(({ data }) => setU(data?.signedUrl)) }, [path])
  return u ? <a href={u} target="_blank"><img src={u} className="h-24 rounded-lg object-cover" title={l} /></a> : null
}
