import React, { useState } from 'react'
import MixtliUploader from './components/MixtliUploader'
import Library from './components/Library'

export default function App(){
  const [tab,setTab]=useState('uploader')
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Mixtli — Uploader & Biblioteca</h1>
          <nav className="flex items-center gap-2">
            <button onClick={()=>setTab('uploader')} className={tab==='uploader'? 'px-3 py-2 rounded-lg bg-blue-600':'px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700'}>Uploader</button>
            <button onClick={()=>setTab('library')} className={tab==='library'? 'px-3 py-2 rounded-lg bg-blue-600':'px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700'}>Biblioteca</button>
          </nav>
        </header>
        {tab==='uploader'? <MixtliUploader/> : <Library/>}
      </div>
    </div>
  )
}
