import { useState } from 'react'
import { getSessions, deleteSession } from './storage'
import type { SavedSession } from './storage'

interface Props {
  onBack: () => void
}

export default function History({ onBack }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>(() => getSessions().reverse())
  const [selected, setSelected] = useState<SavedSession | null>(null)

  function handleDelete(id: string) {
    if (confirm('Dzēst šo treniņu?')) {
      deleteSession(id)
      setSessions(getSessions().reverse())
      if (selected?.id === id) setSelected(null)
    }
  }

  if (selected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setSelected(null)} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>

        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <h2 className="text-xl font-bold">{selected.shooterName}</h2>
          <p className="text-gray-400 text-sm">{selected.disciplineName} · {selected.date}</p>
        </div>

        <div className="bg-amber-500 text-black rounded-xl p-6 mb-4 text-center">
          <p className="text-sm font-bold mb-1">KOPĀ</p>
          <p className="text-5xl font-mono font-bold">{selected.totalScore}-{selected.totalX}X</p>
          <p className="text-sm mt-1">no {selected.maxScore}</p>
        </div>

        <div className="space-y-3 mb-6">
          {selected.stages.map(r => (
            <div key={r.stageNumber} className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-amber-400">Stage {r.stageNumber}</span>
                <span className="font-mono font-bold">{r.matchScore}-{r.score.x}X</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['X', '10', '9', '8', '7', '0', 'M'].map((label, i) => {
                  const keys = ['x', 'ten', 'nine', 'eight', 'seven', 'zero', 'miss'] as const
                  const val = r.score[keys[i]]
                  return (
                    <div key={label}>
                      <div className="text-gray-400 mb-1">{label}</div>
                      <div className={`rounded py-1 font-bold ${val > 0 ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
                        {val}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => handleDelete(selected.id)}
          className="w-full py-3 rounded-xl font-bold bg-red-700 text-white">
          🗑️ Dzēst treniņu
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <button onClick={onBack} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
      <h2 className="text-2xl font-bold text-amber-400 mb-6">📋 Vēsture</h2>

      {sessions.length === 0 ? (
        <div className="text-center text-gray-500 mt-12">
          <p className="text-4xl mb-3">📋</p>
          <p>Nav saglabātu treniņu</p>
          <p className="text-sm mt-2">Pabeidz treniņu lai to redzētu šeit</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{session.shooterName}</p>
                  <p className="text-gray-400 text-sm">{session.disciplineName} · {session.date}</p>
                </div>
                <p className="font-mono font-bold text-amber-400">{session.totalScore}-{session.totalX}X</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setSelected(session)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-bold text-sm hover:bg-gray-600">
                  Skatīt →
                </button>
                <button onClick={() => handleDelete(session.id)}
                  className="bg-red-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}