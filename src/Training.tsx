import { useState } from 'react'
import type { Course } from './types'
import type { HitCounts, Penalty, StageScore } from './types/scoring'
import { EMPTY_HITS } from './types/scoring'
import { ALL_COURSES } from './types'
import { calculateStageScore } from './utils/scoring'
import ScoreInput from './ScoreInput'
import { saveSession } from './storage'

type TrainingScreen = 'setup' | 'scoring' | 'results'

interface Props {
  onBack: () => void
}

export default function Training({ onBack }: Props) {
  const [screen, setScreen] = useState<TrainingScreen>('setup')
  const [shooterName, setShooterName] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course>(ALL_COURSES[0])
  const [currentStage, setCurrentStage] = useState(0)
  const [currentHits, setCurrentHits] = useState<HitCounts>({ ...EMPTY_HITS })
  const [currentPenalties, setCurrentPenalties] = useState<Penalty[]>([])
  const [results, setResults] = useState<StageScore[]>([])

  function startSession() {
    if (!shooterName.trim()) return
    setCurrentStage(0)
    setCurrentHits({ ...EMPTY_HITS })
    setCurrentPenalties([])
    setResults([])
    setScreen('scoring')
  }

  function saveStage() {
    const stage = selectedCourse.stages[currentStage]
    const stageScore = calculateStageScore(
      currentHits,
      currentPenalties,
      0,
      currentStage
    )
    const newResults = [...results, stageScore]
    setResults(newResults)

    if (currentStage + 1 < selectedCourse.stages.length) {
      setCurrentStage(currentStage + 1)
      setCurrentHits({ ...EMPTY_HITS })
      setCurrentPenalties([])
    } else {
      const totalScore = newResults.reduce((sum, r) => sum + r.totalAfterPenalty, 0)
      const totalX = newResults.reduce((sum, r) => sum + r.xCount, 0)
      saveSession({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('lv-LV'),
        shooterName,
        discipline: selectedCourse.discipline as string,
        disciplineName: selectedCourse.name,
        totalScore,
        totalX,
        maxScore: selectedCourse.maxScore,
        stages: newResults.map((r, i) => ({
          stageNumber: i + 1,
          score: {
            x: r.hits.x,
            ten: r.hits.ten,
            nine: r.hits.nine,
            eight: r.hits.eight,
            seven: r.hits.seven,
            zero: r.hits.zero,
            miss: r.hits.miss,
            penalty: r.penalties.reduce((sum, p) => sum + p.count, 0)
          },
          matchScore: r.totalAfterPenalty
        }))
      })
      setScreen('results')
    }
  }

  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={onBack} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>
        <h2 className="text-2xl font-bold text-amber-400 mb-6">Treniņš</h2>

        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Disciplīna</label>
          <div className="grid grid-cols-3 gap-2">
            {ALL_COURSES.map(course => (
              <button key={course.discipline} onClick={() => setSelectedCourse(course)}
                className={`py-3 px-2 rounded-xl text-sm font-bold border-2 ${selectedCourse.discipline === course.discipline ? 'border-amber-500 bg-amber-500 text-black' : 'border-gray-700 bg-gray-800 text-white'}`}>
                {course.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <p className="text-xl font-bold">{selectedCourse.name}</p>
          <p className="text-gray-400 text-sm">{selectedCourse.totalShots} šāvieni · Max {selectedCourse.maxScore} punkti</p>
        </div>

        <div className="mb-6">
          <label className="text-gray-400 text-sm block mb-2">Šāvēja vārds</label>
          <input type="text" value={shooterName} onChange={e => setShooterName(e.target.value)}
            placeholder="Ievadi vārdu..."
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-amber-400 font-bold mb-3">Kurss</h3>
          {selectedCourse.stages.map(s => (
            <div key={s.stageNumber} className="flex justify-between py-2 border-b border-gray-700 last:border-0">
              <div>
                <span className="text-amber-400 font-bold">Stage {s.stageNumber}</span>
                <span className="text-gray-400 text-sm ml-2">{s.description}</span>
              </div>
              <div className="text-right text-sm">
                <span className="text-white">{s.distance}m</span>
                <span className="text-gray-400 ml-2">{s.shots} šāv.</span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={startSession} disabled={!shooterName.trim()}
          className={`w-full py-5 rounded-xl text-xl font-bold ${shooterName.trim() ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          Sākt Treniņu
        </button>
      </div>
    )
  }

  if (screen === 'scoring') {
    const stage = selectedCourse.stages[currentStage]
    return (
      <ScoreInput
        stage={{
          stageNumber: stage.stageNumber,
          distance: stage.distance,
          shots: stage.shots,
          timeSeconds: stage.timeSeconds,
          description: stage.description
        }}
        hits={currentHits}
        penalties={currentPenalties}
        onChange={(h, p) => { setCurrentHits(h); setCurrentPenalties(p) }}
        onSave={saveStage}
        onBack={() => {
          if (currentStage === 0) {
            setScreen('setup')
          } else {
            const prev = results[currentStage - 1]
            setCurrentStage(currentStage - 1)
            setCurrentHits({ ...prev.hits })
            setCurrentPenalties([...prev.penalties])
            setResults(results.slice(0, -1))
          }
        }}
      />
    )
  }

  // Results
  const totalScore = results.reduce((sum, r) => sum + r.totalAfterPenalty, 0)
  const totalX = results.reduce((sum, r) => sum + r.xCount, 0)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-2">Rezultāti</h2>
      <p className="text-gray-400 mb-6">{shooterName} · {selectedCourse.name}</p>

      <div className="bg-amber-500 text-black rounded-xl p-6 mb-6 text-center">
        <p className="text-sm font-bold mb-1">KOPĀ</p>
        <p className="text-5xl font-mono font-bold">{totalScore}-{totalX}X</p>
        <p className="text-sm mt-1">no {selectedCourse.maxScore}</p>
      </div>

      <div className="space-y-3 mb-6">
        {results.map((r, i) => {
          const s = selectedCourse.stages[i]
          const penCount = r.penalties.reduce((sum, p) => sum + p.count, 0)
          return (
            <div key={i} className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-bold">Stage {i + 1}</p>
                <p className="text-gray-400 text-sm">{s.distance}m · {s.description}</p>
                {penCount > 0 && <p className="text-red-400 text-xs">⚠️ {penCount} penalty</p>}
              </div>
              <p className="text-xl font-mono font-bold text-amber-400">{r.totalAfterPenalty}-{r.xCount}X</p>
            </div>
          )
        })}
      </div>

      <button onClick={() => { setScreen('setup'); setShooterName(''); setResults([]) }}
        className="w-full py-4 rounded-xl text-xl font-bold bg-amber-500 text-black mb-3">
        Jauns Treniņš
      </button>

      <button onClick={onBack}
        className="w-full py-4 rounded-xl text-xl font-bold bg-gray-700 text-white">
        Uz Sākumu
      </button>
    </div>
  )
}