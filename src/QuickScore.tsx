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
      setSavedMessage('')
    }
  }

  const totalScore = targetHits.reduce((sum, hits) => sum + calculateRawScore(hits), 0)
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

  const printQuickScore = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 print:bg-white print:text-black">
      <button onClick={onBack} className="text-amber-400 mb-6 text-lg print:hidden">← Atpakaļ</button>
      <h2 className="text-2xl font-bold text-amber-400 mb-6">⚡ Ātrā Punktu Skaitīšana</h2>

      <div className="bg-gray-800 rounded-xl p-6 mb-6 print:bg-white print:text-black">
        <div className="mb-6">
          <label className="text-gray-400 text-sm block mb-2">Šāvēja vārds</label>
          <input
            type="text"
            value={shooterName}
            onChange={e => setShooterName(e.target.value)}
            placeholder="Ievadi vārdu..."
            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-amber-500 outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="text-gray-400 text-sm block mb-2">Izvēlieties disciplīnu</label>
          <select
            value={selectedDiscipline.discipline}
            onChange={e => handleDisciplineChange(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-amber-500 outline-none"
          >
            {ALL_COURSES.map(course => (
              <option key={course.discipline} value={course.discipline}>
                {course.name} ({course.totalShots} šāvieni)
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <p className="text-gray-400 text-sm">Kopējie nepieciešamie šāvieni: <span className="text-amber-400 font-bold">{requiredShots}</span></p>
          <p className="text-gray-400 text-sm">Kopējie ievadītie šāvieni: <span className={shotsMatch ? 'text-green-400' : 'text-red-400'} font-bold>{totalShots}</span></p>
          {!shotsMatch && <p className="text-red-400 text-sm">Šāvienu skaits neatbilst disciplīnai!</p>}
        </div>

        {targets.map((target, targetIndex) => {
          const hits = targetHits[targetIndex] || { ...EMPTY_HITS }
          const targetShots = countShots(hits)
          const targetScore = calculateRawScore(hits)
          const targetMatch = targetShots === target.shots

          return (
            <div key={targetIndex} className="mb-6 bg-gray-700 rounded-lg p-4">
              <h3 className="text-amber-400 font-bold mb-3">{target.name} ({target.shots} šāvieni)</h3>

              <div className="mb-3">
                <p className="text-gray-400 text-sm">Ievadītie šāvieni: <span className={targetMatch ? 'text-green-400' : 'text-red-400'} font-bold>{targetShots}</span></p>
                {!targetMatch && <p className="text-red-400 text-xs">Šāvienu skaits neatbilst mērķim!</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 mb-3">
                {HIT_VALUES.map(key => (
                  <div key={key} className="flex flex-col">
                    <label className="text-gray-400 text-xs mb-1">{HIT_LABELS[key]}</label>
                    <input
                      type="number"
                      min="0"
                      value={hits[key]}
                      onChange={e => updateTargetHit(targetIndex, key, parseInt(e.target.value) || 0)}
                      className="bg-gray-600 text-white rounded p-2 text-center text-sm border border-gray-500 focus:border-amber-500 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-gray-600 rounded p-2 text-center">
                <p className="text-gray-400 text-xs">Punkti</p>
                <p className="text-lg font-mono font-bold text-amber-400">{targetScore}</p>
              </div>
            </div>
          )
        })}

        <div className="bg-gray-700 rounded-lg p-4 text-center print:bg-white print:text-black">
          <p className="text-gray-400 text-sm">Kopējie punkti</p>
          <p className="text-4xl font-mono font-bold text-amber-400">{totalScore}</p>
          <p className="text-gray-400 text-sm mt-1">no {requiredShots} šāvieniem (maksimums {selectedDiscipline.maxScore})</p>
        </div>
      </div>

      <div className="space-y-3 mb-6 print:hidden">
        <button
          onClick={saveQuickScore}
          disabled={!canSave}
          className={`w-full py-4 rounded-xl text-xl font-bold ${canSave ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          💾 Saglabāt vēsturē
        </button>

        <button
          onClick={printQuickScore}
          disabled={!canPrint}
          className={`w-full py-4 rounded-xl text-xl font-bold ${canPrint ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          🖨️ Drukāt PDF
        </button>

        <button
          onClick={() => setShowHistory(true)}
          className="w-full py-4 rounded-xl text-xl font-bold bg-gray-700 text-white hover:bg-gray-600">
          📜 Skatīt vēsturi
        </button>

        {savedMessage && <p className="text-green-400 text-center">{savedMessage}</p>}
      </div>

      <p className="text-gray-400 text-sm text-center print:hidden">
        Izvēlieties disciplīnu un ievadiet trāpījumu skaitu katram mērķim. Kopējais šāvienu skaits jāatbilst disciplīnas prasībām.
      </p>
    </div>
  )
}