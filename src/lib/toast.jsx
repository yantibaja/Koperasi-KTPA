import { createContext, useContext, useState, useCallback } from 'react'
const T = createContext(null)
export const useToast = () => useContext(T)
const ST = { success: ['✓', 'from-emerald-500 to-teal-500'], error: ['!', 'from-rose-500 to-red-500'], info: ['i', 'from-sky-500 to-indigo-500'] }
export function ToastProvider({ children }) {
  const [list, setList] = useState([])
  const push = useCallback((type, title, desc) => { const id = Math.random(); setList(l => [...l, { id, type, title, desc }]); setTimeout(() => setList(l => l.filter(x => x.id !== id)), 4500) }, [])
  const api = { success: (t, d) => push('success', t, d), error: (t, d) => push('error', t, d), info: (t, d) => push('info', t, d) }
  return <T.Provider value={api}>{children}
    <div className="fixed top-3 inset-x-3 z-[100] flex flex-col gap-2 pointer-events-none md:left-auto md:right-4 md:w-96">
      {list.map(x => <div key={x.id} className="toast pointer-events-auto flex gap-3 items-start rounded-2xl bg-white/95 backdrop-blur shadow-xl border border-slate-100 p-3">
        <span className={`grid place-items-center shrink-0 w-9 h-9 rounded-xl text-white font-extrabold bg-gradient-to-br ${ST[x.type][1]}`}>{ST[x.type][0]}</span>
        <div className="min-w-0"><div className="font-bold text-sm">{x.title}</div>{x.desc && <div className="text-xs text-slate-500 break-words">{x.desc}</div>}</div></div>)}
    </div></T.Provider>
}
