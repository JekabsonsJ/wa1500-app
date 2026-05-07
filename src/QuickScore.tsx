import { useState } from 'react'
import type { HitCounts } from './types/scoring'
import { HIT_VALUES, HIT_LABELS, EMPTY_HITS } from './types/scoring'
import { calculateRawScore, countShots } from './utils/scoring'
import { ALL_COURSES } from './types'
import { saveSession } from './storage'
import type { StageResult } from './types'
import History from './History'

interface Target {
  name: string
  shots: number
}

const DISCIPLINE_TARGETS: Record<string, Target[]> = {
  ppc48: [{ name: "Mērķis 1", shots: 48 }],
  ppc60: [
    { name: "Mērķis 1", shots: 30 },
    { name: "Mērķis 2", shots: 30 }
  ],
  pistol1500: [
    { name: "Mērķis 1", shots: 42 },
    { name: "Mērķis 2", shots: 48 },
    { name: "Mērķis 3", shots: 30 },
    { name: "Mērķis 4", shots: 30 }
  ]
}

interface Props {
  onBack: () => void
}

export default function QuickScore({ onBack }: Props) {
  const [selectedDiscipline, setSelectedDiscipline] = useState(ALL_COURSES[0])
  const [shooterName, setShooterName] = useState('')
  const [targetHits, setTargetHits] = useState<HitCounts[]>(() => {
    const initialTargets = DISCIPLINE_TARGETS[ALL_COURSES[0].discipline] || [{ name: 'Mērķis 1', shots: ALL_COURSES[0].totalShots }]
    return initialTargets.map(() => ({ ...EMPTY_HITS }))
  })
  const [penalty, setPenalty] = useState(0)
  const [savedMessage, setSavedMessage] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  if (showHistory) {
    return <History onBack={() => setShowHistory(false)} />
  }

  const targets = DISCIPLINE_TARGETS[selectedDiscipline.discipline] || [{ name: 'Mērķis 1', shots: selectedDiscipline.totalShots }]

  const updateTargetHit = (targetIndex: number, key: keyof HitCounts, value: number) => {
    setTargetHits(prev => {
      const newHits = [...prev]
      if (!newHits[targetIndex]) newHits[targetIndex] = { ...EMPTY_HITS }
      newHits[targetIndex] = { ...newHits[targetIndex], [key]: Math.max(0, value) }
      return newHits
    })
  }

  const handleDisciplineChange = (disciplineId: string) => {
    const course = ALL_COURSES.find(c => c.discipline === disciplineId)
    if (course) {
      setSelectedDiscipline(course)
      const newTargets = DISCIPLINE_TARGETS[disciplineId] || [{ name: 'Mērķis 1', shots: course.totalShots }]
      setTargetHits(newTargets.map(() => ({ ...EMPTY_HITS })))
      setPenalty(0)
      setSavedMessage('')
    }
  }

  const rawScore = targetHits.reduce((sum, hits) => sum + calculateRawScore(hits), 0)
  const totalScore = Math.max(0, rawScore - penalty)
  const totalShots = targetHits.reduce((sum, hits) => sum + countShots(hits), 0)
  const requiredShots = targets.reduce((sum, t) => sum + t.shots, 0)
  const shotsMatch = totalShots === requiredShots
  const totalX = targetHits.reduce((sum, hits) => sum + hits.x, 0)
  const canSave = shotsMatch && shooterName.trim().length > 0
  const canPrint = totalShots > 0

  const saveQuickScore = () => {
    if (!canSave) return
    const stages: StageResult[] = targetHits.map((hits, index) => ({
      stageNumber: index + 1,
      score: {
        x: hits.x,
        ten: hits.ten,
        nine: hits.nine,
        eight: hits.eight,
        seven: hits.seven,
        zero: hits.zero,
        miss: hits.miss,
        penalty: 0
      },
      matchScore: calculateRawScore(hits)
    }))
    if (stages.length > 0) stages[0].score.penalty = penalty

    saveSession({
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('lv-LV'),
      shooterName: shooterName.trim(),
      discipline: selectedDiscipline.discipline as string,
      disciplineName: selectedDiscipline.name,
      totalScore,
      totalX,
      maxScore: selectedDiscipline.maxScore,
      stages
    })

    setSavedMessage('Rezultāts saglabāts vēsturē!')
  }

  const today = new Date().toLocaleDateString('lv-LV')

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 print:bg-white print:text-black print:p-0 print:min-h-0">
      <style>{`
        @media print {
          @page { size: A5; margin: 8mm; }
          body { font-size: 9pt; }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <button onClick={onBack} className="text-amber-400 mb-4 text-lg print:hidden">← Atpakaļ</button>
      <h2 className="text-2xl font-bold text-amber-400 mb-4 print:hidden">⚡ Ātrā Punktu Skaitīšana</h2>

      {/* Print-only header */}
      <div className="hidden print:flex justify-between items-start border-b-2 border-black pb-2 mb-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">Ātrā Punktu Skaitīšana</p>
          <p className="text-base font-bold mt-0.5">{shooterName || '________________________________'}</p>
        </div>
        <div className="text-right text-xs leading-5">
          <p className="font-semibold">{selectedDiscipline.name}</p>
          <p>{today}</p>
          <p>Maks. {selectedDiscipline.maxScore} pts</p>
        </div>
      </div>

      {/* Screen setup fields */}
      <div className="grid grid-cols-2 gap-3 mb-4 print:hidden">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Šāvēja vārds</label>
          <input
            type="text"
            value={shooterName}
            onChange={e => setShooterName(e.target.value)}
            placeholder="Ievadi vārdu..."
            className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:border-amber-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Disciplīna</label>
          <select
            value={selectedDiscipline.discipline}
            onChange={e => handleDisciplineChange(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:border-amber-500 outline-none text-sm"
          >
            {ALL_COURSES.map(course => (
              <option key={course.discipline} value={course.discipline}>
                {course.name} ({course.totalShots} šāvieni)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compact scoring table */}
      <div className="bg-gray-800 rounded-xl p-3 mb-4 print:bg-white print:p-0 print:rounded-none print:mb-2">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-600 print:border-gray-400">
                <th className="text-left py-2 pr-3 text-gray-400 print:text-gray-600 text-xs font-semibold whitespace-nowrap">
                  Mērķis
                </th>
                {HIT_VALUES.map(key => (
                  <th key={key} className="text-center py-2 px-1 text-xs font-semibold text-gray-400 print:text-gray-600" style={{ minWidth: '2.4rem' }}>
                    {HIT_LABELS[key]}
                  </th>
                ))}
                <th className="text-center py-2 px-2 text-xs font-semibold text-gray-400 print:text-gray-600 whitespace-nowrap">
                  Šāv.
                </th>
                <th className="text-center py-2 pl-2 text-xs font-semibold text-gray-400 print:text-gray-600">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target, targetIndex) => {
                const hits = targetHits[targetIndex] || { ...EMPTY_HITS }
                const targetShots = countShots(hits)
                const targetScore = calculateRawScore(hits)
                const targetMatch = targetShots === target.shots

                return (
                  <tr key={targetIndex} className="border-b border-gray-700 print:border-gray-200">
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span className="text-amber-400 print:text-black font-semibold text-xs">M{targetIndex + 1}</span>
                      <span className="text-gray-500 print:text-gray-400 text-xs ml-1">({target.shots})</span>
                    </td>
                    {HIT_VALUES.map(key => (
                      <td key={key} className="py-1 px-1">
                        <input
                          type="number"
                          min="0"
                          value={hits[key] === 0 ? '' : hits[key]}
                          onChange={e => updateTargetHit(targetIndex, key, parseInt(e.target.value) || 0)}
                          placeholder="-"
                          className="w-12 bg-gray-700 print:bg-white text-white print:text-black rounded p-1 text-center text-sm border border-gray-600 print:border-gray-400 focus:border-amber-500 focus:bg-gray-600 outline-none"
                        />
                      </td>
                    ))}
                    <td className={`py-1.5 px-2 text-center font-bold text-xs ${targetMatch ? 'text-green-400 print:text-green-700' : totalShots === 0 ? 'text-gray-500' : 'text-red-400 print:text-red-600'}`}>
                      {targetShots}/{target.shots}
                    </td>
                    <td className="py-1.5 pl-2 text-center font-bold text-amber-400 print:text-black text-sm">
                      {targetScore}
                    </td>
                  </tr>
                )
              })}

              {/* Totals row */}
              <tr className="bg-gray-700 print:bg-gray-100 border-t-2 border-gray-500 print:border-gray-400">
                <td className="py-2 pr-3 text-white print:text-black text-xs font-bold">KOPĀ</td>
                {HIT_VALUES.map(key => {
                  const colTotal = targetHits.reduce((sum, h) => sum + (h[key] || 0), 0)
                  return (
                    <td key={key} className="py-2 px-1 text-center text-xs font-semibold text-gray-300 print:text-gray-600">
                      {colTotal > 0 ? colTotal : <span className="text-gray-600 print:text-gray-400">–</span>}
                    </td>
                  )
                })}
                <td className={`py-2 px-2 text-center font-bold text-sm ${shotsMatch ? 'text-green-400 print:text-green-700' : totalShots === 0 ? 'text-gray-500' : 'text-red-400 print:text-red-600'}`}>
                  {totalShots}/{requiredShots}
                </td>
                <td className="py-2 pl-2 text-center font-bold text-xl text-amber-400 print:text-black">
                  {rawScore}
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {!shotsMatch && totalShots > 0 && (
          <p className="text-red-400 print:hidden text-xs mt-2 pl-1">
            Šāvienu skaits neatbilst disciplīnai! ({totalShots}/{requiredShots})
          </p>
        )}

        {/* Penalty section */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600 print:border-gray-300">
          <label className="text-red-400 print:text-red-700 text-sm font-semibold">Sods (–)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={penalty === 0 ? '' : penalty}
              onChange={e => setPenalty(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="-"
              className="w-16 bg-gray-700 print:bg-white text-red-400 print:text-red-700 rounded p-1.5 text-center text-sm border border-red-700 print:border-red-400 focus:border-red-500 outline-none"
            />
            <span className="text-gray-500 text-xs">pts</span>
          </div>
        </div>
      </div>

      {/* Score summary */}
      <div className="bg-gray-700 print:bg-white rounded-lg px-4 py-3 text-center mb-4 print:border-2 print:border-black print:rounded-none print:py-2">
        {penalty > 0 && (
          <p className="text-gray-400 print:text-gray-500 text-xs mb-1">
            {rawScore} – <span className="text-red-400 print:text-red-600">{penalty}</span> (sods)
          </p>
        )}
        <p className="text-gray-400 print:text-gray-600 text-xs mb-1">{penalty > 0 ? 'Gala rezultāts' : 'Kopējie punkti'}</p>
        <p className="text-4xl print:text-2xl font-mono font-bold text-amber-400 print:text-black">
          {totalScore}
          <span className="text-base text-gray-400 print:text-gray-600 ml-2 font-normal">– {totalX}X</span>
        </p>
        <p className="text-gray-400 print:text-gray-600 text-xs mt-1">
          maks. {selectedDiscipline.maxScore} · {selectedDiscipline.name}
        </p>
      </div>

      {/* Action buttons */}
      <div className="space-y-2 mb-4 print:hidden">
        <button
          onClick={saveQuickScore}
          disabled={!canSave}
          className={`w-full py-3 rounded-xl font-bold ${canSave ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          💾 Saglabāt vēsturē
        </button>

        <button
          onClick={() => window.print()}
          disabled={!canPrint}
          className={`w-full py-3 rounded-xl font-bold ${canPrint ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          🖨️ Drukāt / PDF (A5)
        </button>

        <button
          onClick={() => setShowHistory(true)}
          className="w-full py-3 rounded-xl font-bold bg-gray-700 text-white hover:bg-gray-600">
          📜 Skatīt vēsturi
        </button>

        {savedMessage && <p className="text-green-400 text-center text-sm">{savedMessage}</p>}
      </div>

      <p className="text-gray-500 text-xs text-center print:hidden">
        Ievadiet trāpījumu skaitu. Kopējam šāvienu skaitam jāatbilst disciplīnas prasībām.
      </p>
    </div>
  )
}
