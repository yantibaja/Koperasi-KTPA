import { createContext, useContext, useRef, useState } from 'react'
const C = createContext(null)
export const useConfirm = () => useContext(C)
export function ConfirmProvider({ children }) {
  const [s, setS] = useState(null), r = useRef()
  const ask = (o) => new Promise(res => { r.current = res; setS(o) })
  const done = (v) => { setS(null); r.current?.(v) }
  return <C.Provider value={ask}>{children}
    {s && <div className="fixed inset-0 z-[90] grid place-items-end md:place-items-center bg-black/40 p-4" onClick={() => done(false)}>
      <div className="toast w-full max-w-sm rounded-3xl bg-white p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="text-3xl">{s.danger ? '🗑️' : '❓'}</div><h3 className="font-extrabold text-lg">{s.title}</h3><p className="text-sm text-slate-500">{s.text}</p>
        <div className="flex gap-2"><button className="btn2 flex-1" onClick={() => done(false)}>Batal</button>
          <button className={`flex-1 rounded-2xl text-white font-bold py-3 text-sm ${s.danger ? 'bg-rose-500' : 'bg-brand'}`} onClick={() => done(true)}>{s.ok || 'Ya'}</button></div></div></div>}</C.Provider>
}
