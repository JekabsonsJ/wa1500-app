import { useState } from 'react'
import { getSessions } from './storage'
import type { SavedSession } from './storage'

interface Props {
  onBack: () => void
}

export default function Statistics({ onBack }: Props) {
  const [sessions] = useState<SavedSession[]>(() => getSessions())

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={onBack} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
        <h2 className="text-2xl font-bold text-amber-400 mb-6">📊 Statistika</h2>
        <div className="text-center text-gray-500 mt-12">
          <p className="text-4xl mb-3">📊</p>
          <p>Nav pietiekami datu</p>
          <p className="text-sm mt-2">Pabeidz vismaz vienu treniņu</p>
        </div>
      </div>
    )
  }

  // Group by discipline
  const byDiscipline = sessions.reduce((acc, s) => {
    if (!acc[s.disciplineName]) acc[s.disciplineName] = []
    acc[s.disciplineName].push(s)
    return acc
  }, {} as Record<string, SavedSession[]>)

  // Overall stats
  const best = sessions.reduce((a, b) => a.totalScore > b.totalScore ? a : b)
  const avg = Math.round(sessions.reduce((sum, s) => sum + s.totalScore, 0) / sessions.length)
  const bestX = sessions.reduce((a, b) => a.totalX > b.totalX ? a : b)

  // Last 10 for progress chart
  const last10 = sessions.slice(-10)
  const maxScore = Math.max(...last10.map(s => s.maxScore))
  const chartMax = Math.max(...last10.map(s => s.totalScore))
  const chartMin = Math.min(...last10.map(s => s.totalScore))
  const chartRange = chartMax - chartMin || 1

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <button onClick={onBack} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
      <h2 className="text-2xl font-bold text-amber-400 mb-6">📊 Statistika</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm">Treniņi</p>
          <p className="text-3xl font-bold text-amber-400">{sessions.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm">Vidējais</p>
          <p className="text-3xl font-bold text-amber-400">{avg}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm">Labākais</p>
          <p className="text-2xl font-mono font-bold text-amber-400">{best.totalScore}-{best.totalX}X</p>
          <p className="text-gray-500 text-xs">{best.disciplineName}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm">Vairāk X</p>
          <p className="text-2xl font-mono font-bold text-amber-400">{bestX.totalX}X</p>
          <p className="text-gray-500 text-xs">{bestX.disciplineName}</p>
        </div>
      </div>

      {/* Progress chart */}
      {last10.length > 1 && (
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-amber-400 font-bold mb-4">Progress (pēdējie {last10.length} treniņi)</h3>
          <div className="flex items-end gap-1 h-32">
            {last10.map((s, i) => {
              const height = ((s.totalScore - chartMin) / chartRange) * 100
              const pct = Math.round((s.totalScore / s.maxScore) * 100)
              return (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-400">{s.totalScore}</p>
                  <div className="w-full bg-gray-700 rounded-t-lg relative" style={{ height: '80px' }}>
                    <div
                      className="w-full bg-amber-500 rounded-t-lg absolute bottom-0 transition-all"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{i + 1}</p>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Min: {chartMin}</span>
            <span>Max: {chartMax}</span>
          </div>
        </div>
      )}

      {/* By discipline */}
      <div className="space-y-3">
        <h3 className="text-amber-400 font-bold">Pa disciplīnām</h3>
        {Object.entries(byDiscipline).map(([discName, discSessions]) => {
          const discBest = discSessions.reduce((a, b) => a.totalScore > b.totalScore ? a : b)
          const discAvg = Math.round(discSessions.reduce((sum, s) => sum + s.totalScore, 0) / discSessions.length)
          const discMax = discSessions[0].maxScore
          const pct = Math.round((discAvg / discMax) * 100)
          return (
            <div key={discName} className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold">{discName}</h4>
                <span className="text-gray-400 text-sm">{discSessions.length} treniņi</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Vidējais: <span className="text-white font-mono">{discAvg}</span></span>
                <span className="text-gray-400">Labākais: <span className="text-amber-400 font-mono">{discBest.totalScore}-{discBest.totalX}X</span></span>
              </div>
              <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-400 mt-1">{pct}% no max</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}