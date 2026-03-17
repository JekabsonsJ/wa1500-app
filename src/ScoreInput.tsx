import { useState, useEffect, useRef } from 'react'
import type { HitCounts, Penalty, PenaltyType } from './types/scoring'
import { HIT_VALUES, HIT_LABELS, HIT_POINTS, EMPTY_HITS, PENALTY_LABELS } from './types/scoring'
import { calculateRawScore, applyPenalties, validateShotCount } from './utils/scoring'

interface StageProps {
  stageNumber: number
  distance: number
  shots: number
  timeSeconds: number
  description: string
}

interface Props {
  stage: StageProps
  hits: HitCounts
  penalties: Penalty[]
  onChange: (hits: HitCounts, penalties: Penalty[]) => void
  onSave: () => void
  onBack: () => void
}

const HIT_COLORS: Record<string, string> = {
  x: 'bg-yellow-400 text-black',
  ten: 'bg-amber-500 text-black',
  nine: 'bg-amber-600 text-white',
  eight: 'bg-orange-700 text-white',
  seven: 'bg-orange-800 text-white',
  zero: 'bg-gray-600 text-white',
  miss: 'bg-red-700 text-white',
}

const PENALTY_TYPES: PenaltyType[] = ['late_shot', 'early_shot', 'wrong_position', 'fault_line', 'other']

function beepOnce(frequency: number, duration: number, ctx: AudioContext) {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    osc.type = 'sine'
    gain.gain.value = 0.5
    osc.start()
    osc.stop(ctx.currentTime + duration / 1000)
  } catch {}
}

export default function ScoreInput({ stage, hits, penalties, onChange, onSave, onBack }: Props) {
  const validation = validateShotCount(hits, stage.shots)
  const hitsAfterPenalty = applyPenalties(hits, penalties)
  const rawScore = calculateRawScore(hits)
  const scoreAfterPenalty = calculateRawScore(hitsAfterPenalty)
  const xAfterPenalty = hitsAfterPenalty.x
  const totalPenalties = penalties.reduce((sum, p) => sum + p.count, 0)

  // Timer
  const [timeLeft, setTimeLeft] = useState(stage.timeSeconds)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerFinished, setTimerFinished] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [delaySeconds, setDelaySeconds] = useState(5)
  const [delayInput, setDelayInput] = useState('5')
  const [showPenaltyModal, setShowPenaltyModal] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    setTimeLeft(stage.timeSeconds)
    setTimerRunning(false)
    setTimerFinished(false)
    setCountdown(0)
  }, [stage.stageNumber])

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setTimerRunning(false)
            setTimerFinished(true)
            if (audioCtxRef.current) beepOnce(440, 800, audioCtxRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  function startTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setTimerFinished(false)
    setTimerRunning(false)
    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {}

    if (delaySeconds > 0) {
      setCountdown(delaySeconds)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!)
            setCountdown(0)
            if (audioCtxRef.current) beepOnce(880, 300, audioCtxRef.current)
            setTimerRunning(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (audioCtxRef.current) beepOnce(880, 300, audioCtxRef.current)
      setTimerRunning(true)
    }
  }

  function stopTimer() {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(0)
    setTimerRunning(false)
  }

  function resetTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setTimerRunning(false)
    setTimerFinished(false)
    setCountdown(0)
    setTimeLeft(stage.timeSeconds)
  }

  function adjustHit(key: keyof HitCounts, delta: number) {
    const next = { ...hits, [key]: Math.max(0, hits[key] + delta) }
    onChange(next, penalties)
  }

  function addPenalty(type: PenaltyType) {
    const existing = penalties.find(p => p.type === type)
    let newPenalties: Penalty[]
    if (existing) {
      newPenalties = penalties.map(p => p.type === type ? { ...p, count: p.count + 1 } : p)
    } else {
      newPenalties = [...penalties, { type, count: 1 }]
    }
    onChange(hits, newPenalties)
  }

  function removePenalty(type: PenaltyType) {
    const existing = penalties.find(p => p.type === type)
    if (!existing) return
    let newPenalties: Penalty[]
    if (existing.count <= 1) {
      newPenalties = penalties.filter(p => p.type !== type)
    } else {
      newPenalties = penalties.map(p => p.type === type ? { ...p, count: p.count - 1 } : p)
    }
    onChange(hits, newPenalties)
  }

  function getPenaltyCount(type: PenaltyType): number {
    return penalties.find(p => p.type === type)?.count || 0
  }

  function handleDelayChange(val: string) {
    setDelayInput(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 0 && n <= 30) setDelaySeconds(n)
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}`
  }

  const timerWarning = timeLeft <= 10 && timeLeft > 0 && timerRunning
  const timerPct = (timeLeft / stage.timeSeconds) * 100
  const isCountingDown = countdown > 0

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-amber-400 text-lg">← Atpakaļ</button>
      </div>

      {/* Stage info */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-amber-400">Stage {stage.stageNumber}</h2>
            <p className="text-gray-300 text-sm">{stage.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold">{stage.distance}m</p>
            <p className="text-gray-400 text-sm">{stage.timeSeconds}s</p>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className={`rounded-xl p-4 mb-4 ${timerFinished ? 'bg-red-900' : timerWarning ? 'bg-red-800' : isCountingDown ? 'bg-gray-700' : 'bg-gray-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-sm font-bold">TAIMERIS</p>
          {timerFinished && <p className="text-red-300 text-sm font-bold">⏰ LAIKS BEIDZIES!</p>}
          {isCountingDown && <p className="text-amber-400 text-sm font-bold">⏳ Gatavojas...</p>}
        </div>

        <p className={`text-6xl font-mono font-bold text-center mb-3 ${timerFinished ? 'text-red-400' : timerWarning ? 'text-red-300' : isCountingDown ? 'text-amber-400' : 'text-white'}`}>
          {isCountingDown ? countdown : formatTime(timeLeft)}
        </p>

        {!isCountingDown && (
          <div className="bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${timerFinished ? 'bg-red-500' : timerWarning ? 'bg-red-400' : 'bg-amber-500'}`}
              style={{ width: `${timerPct}%` }} />
          </div>
        )}

        {!timerRunning && !isCountingDown && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <p className="text-gray-400 text-sm">Aizkave:</p>
            <div className="flex gap-1">
              {[0, 3, 5, 10].map(s => (
                <button key={s} onClick={() => handleDelayChange(s.toString())}
                  className={`px-3 py-1 rounded-lg text-sm font-bold ${delaySeconds === s ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>
                  {s}s
                </button>
              ))}
            </div>
            <input type="number" min="0" max="30" value={delayInput}
              onChange={e => handleDelayChange(e.target.value)}
              className="w-16 bg-gray-700 text-white rounded-lg p-1 text-center text-sm border border-gray-600 focus:border-amber-500 outline-none" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {!timerRunning && !isCountingDown ? (
            <button onClick={startTimer}
              className="col-span-2 bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-500">
              ▶ START {delaySeconds > 0 ? `(+${delaySeconds}s)` : ''}
            </button>
          ) : (
            <button onClick={stopTimer}
              className="col-span-2 bg-red-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-red-500">
              ⏸ STOP
            </button>
          )}
          <button onClick={resetTimer} className="bg-gray-700 text-white py-3 rounded-xl font-bold hover:bg-gray-600">↺</button>
        </div>
      </div>

      {/* Shot counter */}
      <div className={`rounded-xl p-3 mb-4 text-center ${validation.valid ? 'bg-green-800' : validation.actual > stage.shots ? 'bg-red-800' : 'bg-gray-800'}`}>
        <p className="text-lg font-mono">
          Šāvieni: <span className="font-bold text-2xl">{validation.actual}</span> / {stage.shots}
        </p>
        {validation.actual > stage.shots && <p className="text-red-300 text-sm">⚠️ Pārāk daudz šāvieni!</p>}
        {validation.valid && <p className="text-green-300 text-sm">✅ Pareizi!</p>}
      </div>

      {/* Hit buttons */}
      <div className="space-y-2 mb-4">
        {HIT_VALUES.map(key => (
          <div key={key} className="flex items-center gap-2">
            <div className={`${HIT_COLORS[key]} rounded-lg w-16 h-12 flex items-center justify-center font-bold text-lg`}>
              {HIT_LABELS[key]}
            </div>
            <button onClick={() => adjustHit(key, -1)}
              className="bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-lg text-2xl font-bold">−</button>
            <div className="flex-1 bg-gray-800 h-12 rounded-lg flex items-center justify-center text-2xl font-mono font-bold">
              {hits[key]}
            </div>
            <button onClick={() => adjustHit(key, 1)}
              className="bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-lg text-2xl font-bold">+</button>
          </div>
        ))}
      </div>

      {/* Penalty section */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <p className="font-bold text-red-400">⚠️ Penalty {totalPenalties > 0 ? `(${totalPenalties})` : ''}</p>
          <button onClick={() => setShowPenaltyModal(!showPenaltyModal)}
            className="text-sm text-amber-400 underline">
            {showPenaltyModal ? 'Aizvērt' : 'Pievienot'}
          </button>
        </div>

        {showPenaltyModal && (
          <div className="space-y-2">
            {PENALTY_TYPES.map(type => (
              <div key={type} className="flex items-center justify-between bg-gray-700 rounded-lg p-2">
                <span className="text-sm font-bold">{PENALTY_LABELS[type]}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => removePenalty(type)}
                    className="bg-gray-600 w-8 h-8 rounded-lg font-bold">−</button>
                  <span className="w-6 text-center font-mono">{getPenaltyCount(type)}</span>
                  <button onClick={() => addPenalty(type)}
                    className="bg-red-700 w-8 h-8 rounded-lg font-bold">+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPenalties > 0 && (
          <div className="mt-2 text-sm text-gray-400">
            {penalties.filter(p => p.count > 0).map(p => (
              <p key={p.type}>• {PENALTY_LABELS[p.type]}: {p.count}× (-{p.count * 10} pts)</p>
            ))}
          </div>
        )}
      </div>

      {/* Score preview */}
      <div className="bg-gray-800 rounded-xl p-3 mb-4 text-center">
        <p className="text-gray-400 text-sm">Stage rezultāts</p>
        <p className="text-3xl font-mono font-bold text-amber-400">
          {scoreAfterPenalty}-{xAfterPenalty}X
        </p>
        {totalPenalties > 0 && (
          <p className="text-red-400 text-xs mt-1">
            Pirms penalty: {rawScore} · Pēc: {scoreAfterPenalty} (-{rawScore - scoreAfterPenalty})
          </p>
        )}
      </div>

      {/* Save button */}
      <button onClick={onSave} disabled={!validation.valid}
        className={`w-full py-4 rounded-xl text-xl font-bold ${validation.valid ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
        Saglabāt Stage {stage.stageNumber}
      </button>
    </div>
  )
}