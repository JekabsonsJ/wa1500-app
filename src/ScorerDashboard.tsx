import { useState } from 'react'
import { getCompetitionByCode, getScorerByCode, getCompetitionRegistrations } from './firebaseService'
import type { FirebaseCompetition, FirebaseScorer, FirebaseRegistration } from './firebaseService'
import type { HitCounts, Penalty, PenaltyType } from './types/scoring'
import { EMPTY_HITS, HIT_VALUES, HIT_LABELS, PENALTY_LABELS } from './types/scoring'
import { calculateStageScore } from './utils/scoring'
import { ALL_COURSES } from './types'

type ScorerScreen = 'login' | 'dashboard' | 'scoring'

interface Props {
  onBack: () => void
}

const PENALTY_TYPES: PenaltyType[] = ['late_shot', 'early_shot', 'wrong_position', 'fault_line', 'other']

export default function ScorerDashboard({ onBack }: Props) {
  const [screen, setScreen] = useState<ScorerScreen>('login')
  const [eventCode, setEventCode] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [event, setEvent] = useState<FirebaseCompetition | null>(null)
  const [scorer, setScorer] = useState<FirebaseScorer | null>(null)
  const [registrations, setRegistrations] = useState<FirebaseRegistration[]>([])
  const [scoredShooters, setScoredShooters] = useState<string[]>([])

  // Scoring state
  const [shooterName, setShooterName] = useState('')
  const [selectedDisciplineIdx, setSelectedDisciplineIdx] = useState(0)
  const [currentStage, setCurrentStage] = useState(0)
  const [currentHits, setCurrentHits] = useState<HitCounts>({ ...EMPTY_HITS })
  const [currentPenalties, setCurrentPenalties] = useState<Penalty[]>([])
  const [showPenalties, setShowPenalties] = useState(false)
  const [savedStages, setSavedStages] = useState<any[]>([])
  const [scoringComplete, setScoringComplete] = useState(false)

  async function handleLogin() {
    if (eventCode.length !== 6 || accessCode.length !== 4) return
    setLoading(true)
    setError('')
    try {
      const foundEvent = await getCompetitionByCode(eventCode)
      if (!foundEvent) { setError('Sacensība nav atrasta.'); setLoading(false); return }
      const foundScorer = await getScorerByCode(foundEvent.id!, accessCode)
      if (!foundScorer) { setError('Nepareizs piekļuves kods.'); setLoading(false); return }
      const regs = await getCompetitionRegistrations(foundEvent.id!)
      setEvent(foundEvent)
      setScorer(foundScorer)
      setRegistrations(regs.filter(r => r.status === 'confirmed'))
      setScreen('dashboard')
    } catch (e) {
      console.error(e)
      setError('Kļūda pieslēdzoties.')
    }
    setLoading(false)
  }

  function startScoring() {
    if (!shooterName.trim()) return
    setCurrentStage(0)
    setCurrentHits({ ...EMPTY_HITS })
    setCurrentPenalties([])
    setSavedStages([])
    setScoringComplete(false)
    setScreen('scoring')
  }

  function adjustHit(key: keyof HitCounts, delta: number) {
    setCurrentHits(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }))
  }

  function addPenalty(type: PenaltyType) {
    setCurrentPenalties(prev => {
      const exists = prev.find(p => p.type === type)
      if (exists) return prev.map(p => p.type === type ? { ...p, count: p.count + 1 } : p)
      return [...prev, { type, count: 1 }]
    })
  }

  function removePenalty(type: PenaltyType) {
    setCurrentPenalties(prev => {
      const exists = prev.find(p => p.type === type)
      if (!exists) return prev
      if (exists.count <= 1) return prev.filter(p => p.type !== type)
      return prev.map(p => p.type === type ? { ...p, count: p.count - 1 } : p)
    })
  }

  function getPenaltyCount(type: PenaltyType) {
    return currentPenalties.find(p => p.type === type)?.count || 0
  }

  function getCourse() {
    if (!event) return ALL_COURSES[0]
    const disc = event.disciplines[selectedDisciplineIdx]
    return ALL_COURSES.find(c => c.discipline === disc?.discipline) || ALL_COURSES[0]
  }

  function saveStage() {
    const course = getCourse()
    const stage = course.stages[currentStage]
    const totalShots = Object.values(currentHits).reduce((a, b) => a + b, 0)
    if (totalShots !== stage.shots) return

    const stageScore = calculateStageScore(currentHits, currentPenalties, 0, currentStage)
    const newStages = [...savedStages, stageScore]
    setSavedStages(newStages)

    if (currentStage + 1 < course.stages.length) {
      setCurrentStage(currentStage + 1)
      setCurrentHits({ ...EMPTY_HITS })
      setCurrentPenalties([])
    } else {
      setScoringComplete(true)
    }
  }

  // ── Login ──
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={onBack} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>
        <h2 className="text-2xl font-bold text-amber-400 mb-6">📋 Punktu Skaitītājs</h2>
        <div className="bg-gray-800 rounded-xl p-6 mb-4">
          <label className="text-gray-400 text-sm block mb-2">Sacensības kods (6 cipari)</label>
          <input type="number" value={eventCode}
            onChange={e => setEventCode(e.target.value.slice(0, 6))}
            placeholder="000000"
            className="w-full bg-gray-700 text-white rounded-xl p-4 text-3xl font-mono text-center border border-gray-600 focus:border-amber-500 outline-none tracking-widest mb-4" />
          <label className="text-gray-400 text-sm block mb-2">Scorer kods (4 cipari)</label>
          <input type="number" value={accessCode}
            onChange={e => setAccessCode(e.target.value.slice(0, 4))}
            placeholder="0000"
            className="w-full bg-gray-700 text-white rounded-xl p-4 text-3xl font-mono text-center border border-gray-600 focus:border-amber-500 outline-none tracking-widest" />
          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
        </div>
        <button onClick={handleLogin}
          disabled={eventCode.length !== 6 || accessCode.length !== 4 || loading}
          className={`w-full py-5 rounded-xl text-xl font-bold ${eventCode.length === 6 && accessCode.length === 4 && !loading ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          {loading ? 'Pievieno...' : 'Pieslēgties →'}
        </button>
      </div>
    )
  }

  // ── Dashboard ──
  if (screen === 'dashboard') {
    const course = getCourse()
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h2 className="text-xl font-bold text-amber-400">{event?.name}</h2>
          <p className="text-gray-400 text-sm">{event?.date} · {event?.location}</p>
          <p className="text-green-400 text-sm mt-1">✅ Pieslēdzies kā: {scorer?.name || 'Scorer'}</p>
        </div>

        {event && event.disciplines.length > 1 && (
          <div className="mb-4">
            <label className="text-gray-400 text-sm block mb-2">Disciplīna</label>
            <div className="grid grid-cols-3 gap-2">
              {event.disciplines.map((d, i) => (
                <button key={i} onClick={() => setSelectedDisciplineIdx(i)}
                  className={`py-2 px-2 rounded-xl text-sm font-bold border-2 ${selectedDisciplineIdx === i ? 'border-amber-500 bg-amber-500 text-black' : 'border-gray-700 bg-gray-800 text-white'}`}>
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Izvēlies šāvēju</label>
          {registrations.length > 0 ? (
            <div className="space-y-2">
              {registrations.map(reg => {
                const isScored = scoredShooters.includes(reg.shooterName)
                return (
                  <button key={reg.id}
                    onClick={() => !isScored && setShooterName(reg.shooterName)}
                    disabled={isScored}
                    className={`w-full p-3 rounded-xl text-left border-2 ${
                      isScored
                        ? 'border-gray-600 bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                        : shooterName === reg.shooterName
                          ? 'border-amber-500 bg-amber-500 text-black'
                          : 'border-gray-700 bg-gray-800 text-white'
                    }`}>
                    <p className="font-bold">
                      {isScored && <span className="text-green-400 mr-1">✓</span>}
                      {reg.shooterName}
                    </p>
                    <p className="text-sm opacity-75">
                      {reg.disciplines.map(d => `${d.disciplineName} · ${d.relayName}`).join(', ')}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <input type="text" value={shooterName} onChange={e => setShooterName(e.target.value)}
              placeholder="Ievadi šāvēja vārdu..."
              className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-amber-400 font-bold mb-2">{course.name}</h3>
          {course.stages.map(s => (
            <div key={s.stageNumber} className="flex justify-between py-1 text-sm border-b border-gray-700 last:border-0">
              <span className="text-gray-300">Stage {s.stageNumber} · {s.distance}m</span>
              <span className="text-gray-400">{s.shots} šāv. · {s.timeSeconds}s</span>
            </div>
          ))}
        </div>

        <button onClick={startScoring} disabled={!shooterName.trim()}
          className={`w-full py-5 rounded-xl text-xl font-bold ${shooterName.trim() ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          🎯 Sākt Skaitīšanu
        </button>
      </div>
    )
  }

  // ── Scoring ──
  if (screen === 'scoring') {
    const course = getCourse()

    if (scoringComplete) {
      const totalScore = savedStages.reduce((sum: number, s: any) => sum + s.totalAfterPenalty, 0)
      const totalX = savedStages.reduce((sum: number, s: any) => sum + s.xCount, 0)
      return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
          <h2 className="text-2xl font-bold text-amber-400 mb-2">Rezultāti</h2>
          <p className="text-gray-400 mb-4">{shooterName} · {course.name}</p>
          <div className="bg-amber-500 text-black rounded-xl p-6 mb-6 text-center">
            <p className="text-sm font-bold mb-1">KOPĀ</p>
            <p className="text-5xl font-mono font-bold">{totalScore}-{totalX}X</p>
          </div>
          <div className="space-y-2 mb-6">
            {savedStages.map((r: any, i: number) => (
              <div key={i} className="bg-gray-800 rounded-xl p-3 flex justify-between">
                <span className="font-bold">Stage {i + 1} · {course.stages[i].distance}m</span>
                <span className="font-mono font-bold text-amber-400">{r.totalAfterPenalty}-{r.xCount}X</span>
              </div>
            ))}
          </div>
          <button onClick={() => {
            setScoredShooters(prev => [...prev, shooterName])
            setScreen('dashboard')
            setShooterName('')
          }} className="w-full py-4 rounded-xl text-xl font-bold bg-amber-500 text-black mb-3">
            Nākamais Šāvējs
          </button>
          <button onClick={() => setScreen('login')}
            className="w-full py-4 rounded-xl text-xl font-bold bg-gray-700 text-white">
            Iziet
          </button>
        </div>
      )
    }

    const stage = course.stages[currentStage]
    const totalShots = Object.values(currentHits).reduce((a, b) => a + b, 0)
    const isValid = totalShots === stage.shots
    const totalPenalties = currentPenalties.reduce((sum, p) => sum + p.count, 0)

    const hitsAfterPen = { ...currentHits }
    let remaining = totalPenalties
    const removalOrder: (keyof HitCounts)[] = ['x', 'ten', 'nine', 'eight', 'seven', 'zero']
    for (const key of removalOrder) {
      if (remaining <= 0) break
      const toRemove = Math.min(hitsAfterPen[key], remaining)
      hitsAfterPen[key] -= toRemove
      hitsAfterPen.miss += toRemove
      remaining -= toRemove
    }
    const scoreAfterPen = hitsAfterPen.x * 10 + hitsAfterPen.ten * 10 + hitsAfterPen.nine * 9 + hitsAfterPen.eight * 8 + hitsAfterPen.seven * 7

    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <button onClick={() => setScreen('dashboard')} className="text-amber-400 mb-3 text-lg">← Atpakaļ</button>
        <div className="bg-gray-800 rounded-xl p-3 mb-3 flex justify-between items-center">
          <div>
            <p className="font-bold text-amber-400">{shooterName}</p>
            <p className="text-gray-400 text-sm">Stage {currentStage + 1} / {course.stages.length}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold">{stage.distance}m</p>
            <p className="text-gray-400 text-sm">{stage.shots} šāv. · {stage.timeSeconds}s</p>
          </div>
        </div>

        <div className={`rounded-xl p-3 mb-3 text-center ${isValid ? 'bg-green-800' : totalShots > stage.shots ? 'bg-red-800' : 'bg-gray-800'}`}>
          <p className="font-mono text-lg">
            Šāvieni: <span className="font-bold text-2xl">{totalShots}</span> / {stage.shots}
          </p>
          {isValid && <p className="text-green-300 text-sm">✅ Pareizi!</p>}
          {totalShots > stage.shots && <p className="text-red-300 text-sm">⚠️ Pārāk daudz!</p>}
        </div>

        <div className="space-y-2 mb-3">
          {HIT_VALUES.map(key => (
            <div key={key} className="flex items-center gap-2">
              <div className={`rounded-lg w-14 h-12 flex items-center justify-center font-bold text-lg
                ${key === 'x' ? 'bg-yellow-400 text-black' :
                  key === 'ten' ? 'bg-amber-500 text-black' :
                  key === 'nine' ? 'bg-amber-600 text-white' :
                  key === 'eight' ? 'bg-orange-700 text-white' :
                  key === 'seven' ? 'bg-orange-800 text-white' :
                  key === 'zero' ? 'bg-gray-600 text-white' :
                  'bg-red-700 text-white'}`}>
                {HIT_LABELS[key]}
              </div>
              <button onClick={() => adjustHit(key, -1)} className="bg-gray-700 w-12 h-12 rounded-lg text-2xl font-bold">−</button>
              <div className="flex-1 bg-gray-800 h-12 rounded-lg flex items-center justify-center text-2xl font-mono font-bold">
                {currentHits[key]}
              </div>
              <button onClick={() => adjustHit(key, 1)} className="bg-gray-700 w-12 h-12 rounded-lg text-2xl font-bold">+</button>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-xl p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-red-400 text-sm">⚠️ Penalty {totalPenalties > 0 ? `(${totalPenalties})` : ''}</p>
            <button onClick={() => setShowPenalties(!showPenalties)} className="text-amber-400 text-sm underline">
              {showPenalties ? 'Aizvērt' : 'Pievienot'}
            </button>
          </div>
          {showPenalties && (
            <div className="space-y-2">
              {PENALTY_TYPES.map(type => (
                <div key={type} className="flex items-center justify-between bg-gray-700 rounded-lg p-2">
                  <span className="text-sm font-bold">{PENALTY_LABELS[type]}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removePenalty(type)} className="bg-gray-600 w-8 h-8 rounded-lg font-bold">−</button>
                    <span className="w-6 text-center font-mono">{getPenaltyCount(type)}</span>
                    <button onClick={() => addPenalty(type)} className="bg-red-700 w-8 h-8 rounded-lg font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-3 mb-4 text-center">
          <p className="text-gray-400 text-sm">Rezultāts</p>
          <p className="text-3xl font-mono font-bold text-amber-400">{scoreAfterPen}-{hitsAfterPen.x}X</p>
        </div>

        <button onClick={saveStage} disabled={!isValid}
          className={`w-full py-4 rounded-xl text-xl font-bold ${isValid ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          {currentStage + 1 < course.stages.length ? `Saglabāt → Stage ${currentStage + 2}` : 'Pabeigt'}
        </button>
      </div>
    )
  }

  return null
}