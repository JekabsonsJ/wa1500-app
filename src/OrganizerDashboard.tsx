import { GENDER_LABELS } from './types/scoring'
import type { Gender } from './types/scoring'
import { useState, useEffect } from 'react'
import { ALL_COURSES } from './types'
import type { Course } from './types'
import Competition from './Competition'
import {
  createCompetition,
  getOrganizerCompetitions,
  deleteCompetition,
  subscribeToRegistrations,
  subscribeToResults,
  updateRegistration,
  deleteRegistration,
  createScorer,
  getEventScorers,
  deleteScorer
} from './firebaseService'
import type { FirebaseCompetition, FirebaseRegistration, FirebaseScorer, FirebaseResult } from './firebaseService'

interface RelayConfig {
  id: string
  name: string
  time: string
  maxShooters: number
}

interface DisciplineConfig {
  course: Course
  relays: RelayConfig[]
}

type OrgScreen = 'dashboard' | 'create' | 'manage' | 'registrations' | 'competition' | 'results'

interface Props {
  onBack: () => void
}

const ORGANIZER_ID = 'organizer_' + (localStorage.getItem('wa1500_organizer_id') || (() => {
  const id = Math.random().toString(36).slice(2)
  localStorage.setItem('wa1500_organizer_id', id)
  return id
})())

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateScorerCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export default function OrganizerDashboard({ onBack }: Props) {
  const [screen, setScreen] = useState<OrgScreen>('dashboard')
  const [competitions, setCompetitions] = useState<FirebaseCompetition[]>([])
  const [activeComp, setActiveComp] = useState<FirebaseCompetition | null>(null)
  const [registrations, setRegistrations] = useState<FirebaseRegistration[]>([])
  const [scorers, setScorers] = useState<FirebaseScorer[]>([])
  const [results, setResults] = useState<FirebaseResult[]>([])
  const [loading, setLoading] = useState(true)
  const [resultsDiscIdx, setResultsDiscIdx] = useState(0)
  const [resultsFilter, setResultsFilter] = useState<string>('all')
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [selectedDisciplines, setSelectedDisciplines] = useState<DisciplineConfig[]>([])
  const [relayInputs, setRelayInputs] = useState<Record<string, { name: string; time: string; max: string }>>({})

  // Scorer form
  const [newScorerName, setNewScorerName] = useState('')
  const [newScorerPoints, setNewScorerPoints] = useState('')

  // Add relay form
  const [newRelayName, setNewRelayName] = useState('')
  const [newRelayTime, setNewRelayTime] = useState('')

  useEffect(() => { loadCompetitions() }, [])

  useEffect(() => {
    if (activeComp?.id) loadScorers(activeComp.id)
  }, [activeComp?.id])

  useEffect(() => {
    if (screen === 'registrations' && activeComp?.id) {
      const unsub = subscribeToRegistrations(activeComp.id, regs => setRegistrations(regs))
      return unsub
    }
  }, [screen, activeComp?.id])

  useEffect(() => {
    if (screen === 'results' && activeComp?.id) {
      const unsub = subscribeToResults(activeComp.id, r => setResults(r))
      return unsub
    }
  }, [screen, activeComp?.id])

  async function loadCompetitions() {
    setLoading(true)
    try {
      const comps = await getOrganizerCompetitions(ORGANIZER_ID)
      setCompetitions(comps)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function loadScorers(compId: string) {
    try {
      const s = await getEventScorers(compId)
      setScorers(s)
    } catch (e) { console.error(e) }
  }

  function toggleDiscipline(course: Course) {
    const exists = selectedDisciplines.find(d => d.course.discipline === course.discipline)
    if (exists) {
      setSelectedDisciplines(prev => prev.filter(d => d.course.discipline !== course.discipline))
    } else {
      setSelectedDisciplines(prev => [...prev, { course, relays: [] }])
    }
  }

  function addRelay(discipline: string) {
    const input = relayInputs[discipline] || { name: '', time: '', max: '8' }
    if (!input.name.trim()) return
    setSelectedDisciplines(prev => prev.map(d => {
      if (d.course.discipline !== discipline) return d
      return { ...d, relays: [...d.relays, { id: Date.now().toString(), name: input.name.trim(), time: input.time, maxShooters: parseInt(input.max) || 8 }] }
    }))
    setRelayInputs(prev => ({ ...prev, [discipline]: { name: '', time: '', max: '8' } }))
  }

  function removeRelay(discipline: string, relayId: string) {
    setSelectedDisciplines(prev => prev.map(d => {
      if (d.course.discipline !== discipline) return d
      return { ...d, relays: d.relays.filter(r => r.id !== relayId) }
    }))
  }

  async function handleCreateCompetition() {
    if (!name.trim() || selectedDisciplines.length === 0) return
    try {
      await createCompetition({
        code: generateCode(),
        name: name.trim(),
        date,
        location: location.trim(),
        organizerId: ORGANIZER_ID,
        status: 'registration',
        disciplines: selectedDisciplines.map(d => ({
          discipline: d.course.discipline,
          name: d.course.name,
          relays: d.relays
        }))
      })
      setName(''); setDate(''); setLocation('')
      setSelectedDisciplines([]); setRelayInputs({})
      await loadCompetitions()
      setScreen('dashboard')
    } catch (e) {
      console.error(e)
      alert('Kļūda veidojot sacensību!')
    }
  }

  async function handleDeleteCompetition(compId: string, compName: string) {
    if (!confirm(`Dzēst sacensību "${compName}"?`)) return
    try {
      await deleteCompetition(compId)
      await loadCompetitions()
    } catch (e) { console.error(e) }
  }

  async function handleCreateScorer() {
    if (!newScorerName.trim() || !activeComp?.id) return
    try {
      await createScorer(activeComp.id, {
        name: newScorerName.trim(),
        accessCode: generateScorerCode(),
        firingPoints: newScorerPoints.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
      })
      await loadScorers(activeComp.id)
      setNewScorerName(''); setNewScorerPoints('')
    } catch (e) { console.error(e) }
  }

  async function handleDeleteScorer(scorerId: string) {
    if (!confirm('Dzēst šo scorer?') || !activeComp?.id) return
    await deleteScorer(activeComp.id, scorerId)
    await loadScorers(activeComp.id)
  }

  async function handleConfirmReg(regId: string) {
    if (!activeComp?.id) return
    await updateRegistration(activeComp.id, regId, { status: 'confirmed' })
  }

  async function handleCancelReg(regId: string) {
    if (!activeComp?.id || !confirm('Atcelt šī dalībnieka reģistrāciju?')) return
    await updateRegistration(activeComp.id, regId, { status: 'cancelled' })
  }

  async function handleDeleteReg(regId: string) {
    if (!activeComp?.id || !confirm('Dzēst šo reģistrāciju?')) return
    await deleteRegistration(activeComp.id, regId)
  }

  if (screen === 'competition' && activeComp) {
    return <Competition onBack={() => setScreen('manage')} />
  }

  // Dashboard
  if (screen === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-amber-400 text-lg">← Atpakaļ</button>
          <h2 className="text-2xl font-bold text-amber-400">🏆 Organizators</h2>
        </div>
        <button onClick={() => setScreen('create')}
          className="w-full bg-amber-500 text-black font-bold py-6 rounded-xl text-xl mb-6 hover:bg-amber-400">
          + Jauna Sacensība
        </button>
        {loading ? (
          <p className="text-center text-gray-400">Ielādē...</p>
        ) : competitions.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-4xl mb-3">📋</p>
            <p>Nav izveidotu sacensību</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-gray-400 font-bold">Manas sacensības</h3>
            {competitions.map(comp => (
              <div key={comp.id} className="bg-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{comp.name}</h3>
                    <p className="text-gray-400 text-sm">{comp.date} · {comp.location}</p>
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${comp.status === 'active' ? 'bg-green-700 text-green-200' : comp.status === 'registration' ? 'bg-blue-700 text-blue-200' : 'bg-gray-700 text-gray-300'}`}>
                      {comp.status === 'registration' ? 'Reģistrācija' : comp.status === 'active' ? 'Aktīva' : comp.status === 'completed' ? 'Pabeigta' : 'Melnraksts'}
                    </span>
                  </div>
                  <div className="bg-amber-500 text-black rounded-lg px-3 py-1 font-mono font-bold text-lg">
                    {comp.code}
                  </div>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {comp.disciplines.map(d => (
                    <span key={d.discipline} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                      {d.name} · {d.relays.length} maiņas
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setActiveComp(comp); setScreen('manage') }}
                    className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-bold hover:bg-gray-600">
                    Pārvaldīt →
                  </button>
                  <button onClick={() => handleDeleteCompetition(comp.id!, comp.name)}
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

  // Create
  if (screen === 'create') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('dashboard')} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>
        <h2 className="text-2xl font-bold text-amber-400 mb-6">Jauna Sacensība</h2>
        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Nosaukums *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Sacensību nosaukums..."
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
        </div>
        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Datums</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
        </div>
        <div className="mb-6">
          <label className="text-gray-400 text-sm block mb-2">Vieta</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Šautuves nosaukums..."
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
        </div>
        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Disciplīnas *</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {ALL_COURSES.map(course => (
              <button key={course.discipline} onClick={() => toggleDiscipline(course)}
                className={`py-3 px-2 rounded-xl text-sm font-bold border-2 ${selectedDisciplines.find(d => d.course.discipline === course.discipline) ? 'border-amber-500 bg-amber-500 text-black' : 'border-gray-700 bg-gray-800 text-white'}`}>
                {course.name}
              </button>
            ))}
          </div>
        </div>
        {selectedDisciplines.map(disc => (
          <div key={disc.course.discipline} className="bg-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-amber-400 font-bold mb-3">{disc.course.name} — Maiņas</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input type="text"
                value={relayInputs[disc.course.discipline]?.name || ''}
                onChange={e => setRelayInputs(prev => ({ ...prev, [disc.course.discipline]: { ...prev[disc.course.discipline] || { time: '', max: '8' }, name: e.target.value } }))}
                placeholder="Nosaukums"
                className="bg-gray-700 text-white rounded-xl p-3 text-sm border border-gray-600 focus:border-amber-500 outline-none" />
              <input type="time"
                value={relayInputs[disc.course.discipline]?.time || ''}
                onChange={e => setRelayInputs(prev => ({ ...prev, [disc.course.discipline]: { ...prev[disc.course.discipline] || { name: '', max: '8' }, time: e.target.value } }))}
                className="bg-gray-700 text-white rounded-xl p-3 text-sm border border-gray-600 focus:border-amber-500 outline-none" />
              <input type="number" min="1" max="12"
                value={relayInputs[disc.course.discipline]?.max || '8'}
                onChange={e => setRelayInputs(prev => ({ ...prev, [disc.course.discipline]: { ...prev[disc.course.discipline] || { name: '', time: '' }, max: e.target.value } }))}
                placeholder="Max"
                className="bg-gray-700 text-white rounded-xl p-3 text-sm border border-gray-600 focus:border-amber-500 outline-none" />
            </div>
            <button onClick={() => addRelay(disc.course.discipline)}
              className="w-full py-2 rounded-xl font-bold bg-amber-500 text-black mb-3 text-sm">
              + Pievienot maiņu
            </button>
            {disc.relays.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">Nav maiņu</p>
            ) : (
              <div className="space-y-2">
                {disc.relays.map(relay => (
                  <div key={relay.id} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <span className="font-bold">{relay.name}</span>
                      {relay.time && <span className="text-amber-400 text-sm ml-2">🕐 {relay.time}</span>}
                      <span className="text-gray-400 text-sm ml-2">max {relay.maxShooters}</span>
                    </div>
                    <button onClick={() => removeRelay(disc.course.discipline, relay.id)} className="text-red-400 px-2">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <button onClick={handleCreateCompetition}
          disabled={!name.trim() || selectedDisciplines.length === 0}
          className={`w-full py-5 rounded-xl text-xl font-bold mt-4 ${name.trim() && selectedDisciplines.length > 0 ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          Izveidot Sacensību
        </button>
      </div>
    )
  }

  // Manage
  if (screen === 'manage' && activeComp) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('dashboard')} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{activeComp.name}</h2>
              <p className="text-gray-400 text-sm">{activeComp.date} · {activeComp.location}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-1">Kods šāvējiem</p>
              <div className="bg-amber-500 text-black rounded-lg px-4 py-2 font-mono font-bold text-2xl">
                {activeComp.code}
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => setScreen('registrations')}
          className="w-full py-4 rounded-xl text-xl font-bold bg-blue-600 text-white mb-3">
          👥 Dalībnieku pieteikumi
        </button>

        <button onClick={() => { setResultsDiscIdx(0); setExpandedResult(null); setScreen('results') }}
          className="w-full py-4 rounded-xl text-xl font-bold bg-purple-600 text-white mb-3">
          🏆 Rezultāti
        </button>

        {/* Scorer management */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <h3 className="text-amber-400 font-bold mb-3">📋 Scorer kodi</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="text" value={newScorerName} onChange={e => setNewScorerName(e.target.value)}
              placeholder="Scorer vārds"
              className="bg-gray-700 text-white rounded-xl p-3 border border-gray-600 focus:border-amber-500 outline-none text-sm" />
            <input type="text" value={newScorerPoints} onChange={e => setNewScorerPoints(e.target.value)}
              placeholder="Punkti (1,2,3)"
              className="bg-gray-700 text-white rounded-xl p-3 border border-gray-600 focus:border-amber-500 outline-none text-sm" />
          </div>
          <button onClick={handleCreateScorer} disabled={!newScorerName.trim()}
            className={`w-full py-2 rounded-xl font-bold text-sm mb-3 ${newScorerName.trim() ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500'}`}>
            + Pievienot Scorer
          </button>
          {scorers.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">Nav scorer kodu</p>
          ) : (
            <div className="space-y-2">
              {scorers.map(scorer => (
                <div key={scorer.id} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{scorer.name}</p>
                    <p className="text-gray-400 text-xs">
                      Kods: <span className="font-mono text-amber-400 font-bold">{scorer.accessCode}</span>
                      {scorer.firingPoints.length > 0 && ` · Punkti: ${scorer.firingPoints.join(', ')}`}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteScorer(scorer.id!)} className="text-red-400 px-2">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setScreen('competition')}
          className="w-full py-4 rounded-xl text-xl font-bold bg-amber-500 text-black mb-3">
          🎯 Sākt Sacensības
        </button>

        <div className="space-y-3">
          {activeComp.disciplines.map(d => (
            <div key={d.discipline} className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-amber-400 font-bold mb-2">{d.name}</h3>
              {d.relays.map(relay => (
                <div key={relay.id} className="bg-gray-700 rounded-lg p-3 mb-2 flex justify-between items-center">
                  <div>
                    <span className="font-bold">{relay.name}</span>
                    {relay.time && <span className="text-amber-400 text-sm ml-2">🕐 {relay.time}</span>}
                    <span className="text-gray-400 text-sm ml-2">max {relay.maxShooters}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Registrations
  if (screen === 'registrations' && activeComp) {
    const pending = registrations.filter(r => r.status === 'pending')
    const confirmed = registrations.filter(r => r.status === 'confirmed')
    const cancelled = registrations.filter(r => r.status === 'cancelled')

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('manage')} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
        <h2 className="text-xl font-bold text-amber-400 mb-4">👥 Dalībnieku pieteikumi</h2>
        <p className="text-gray-400 text-sm mb-4">{activeComp.name}</p>

        {registrations.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-4xl mb-3">👥</p>
            <p>Nav pieteikumu vēl</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div>
                <h3 className="text-yellow-400 font-bold mb-2">⏳ Gaida apstiprinājumu ({pending.length})</h3>
                <div className="space-y-2">
                  {pending.map(reg => (
                    <div key={reg.id} className="bg-gray-800 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold">{reg.shooterName}</p>
                          <p className="text-gray-400 text-sm">{reg.club} · {GENDER_LABELS[reg.gender as Gender]}</p>
                        </div>
                      </div>
                      {reg.disciplines.map((d, i) => (
                        <p key={i} className="text-gray-400 text-sm">
                          📍 {d.disciplineName} · {d.relayName} {d.relayTime && `🕐 ${d.relayTime}`}
                          {(d as any).shooterClass && (d as any).shooterClass !== 'none' && ` · ${(d as any).shooterClass}`}
                        </p>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleConfirmReg(reg.id!)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm">✓ Apstiprināt</button>
                        <button onClick={() => handleCancelReg(reg.id!)}
                          className="flex-1 bg-red-700 text-white py-2 rounded-lg font-bold text-sm">✕ Atcelt</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {confirmed.length > 0 && (
              <div>
                <h3 className="text-green-400 font-bold mb-2">✅ Apstiprināti ({confirmed.length})</h3>
                <div className="space-y-2">
                  {confirmed.map(reg => (
                    <div key={reg.id} className="bg-gray-800 rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{reg.shooterName}</p>
                        {reg.disciplines.map((d, i) => (
                          <p key={i} className="text-gray-400 text-xs">
                            {d.disciplineName} · {d.relayName}
                            {(d as any).shooterClass && (d as any).shooterClass !== 'none' && ` · ${(d as any).shooterClass}`}
                          </p>
                        ))}
                      </div>
                      <button onClick={() => handleCancelReg(reg.id!)}
                        className="bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-bold">Atcelt</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cancelled.length > 0 && (
              <div>
                <h3 className="text-red-400 font-bold mb-2">❌ Atcelti ({cancelled.length})</h3>
                <div className="space-y-2">
                  {cancelled.map(reg => (
                    <div key={reg.id} className="bg-gray-800 rounded-xl p-3 flex justify-between items-center opacity-60">
                      <div>
                        <p className="font-bold">{reg.shooterName}</p>
                        {reg.disciplines.map((d, i) => (
                          <p key={i} className="text-gray-400 text-xs">{d.disciplineName} · {d.relayName}</p>
                        ))}
                      </div>
                      <button onClick={() => handleDeleteReg(reg.id!)}
                        className="bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-bold">🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Results / Leaderboard
  if (screen === 'results' && activeComp) {
    const disciplines = activeComp.disciplines
    const activeDisc = disciplines[resultsDiscIdx]

    const CLASS_FILTERS: { key: string; label: string }[] = [
      { key: 'all', label: 'Visi' },
      { key: 'male', label: '♂ Vīrieši' },
      { key: 'female', label: '♀ Sievietes' },
      { key: 'high_master', label: 'High Master' },
      { key: 'master', label: 'Master' },
      { key: 'expert', label: 'Expert' },
      { key: 'sharpshooter', label: 'Sharpshooter' },
      { key: 'marksman', label: 'Marksman' },
      { key: 'unclassified', label: 'Unclassified' },
    ]

    const discResults = results
      .filter(r => r.disciplineId === activeDisc?.discipline)
      .filter(r => {
        if (resultsFilter === 'all') return true
        if (resultsFilter === 'male' || resultsFilter === 'female') return r.gender === resultsFilter
        return r.classification === resultsFilter
      })
      .sort((a, b) => b.totalScore - a.totalScore || b.totalX - a.totalX)

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('manage')} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
        <h2 className="text-xl font-bold text-amber-400 mb-1">🏆 Rezultāti</h2>
        <p className="text-gray-400 text-sm mb-4">{activeComp.name}</p>

        {/* Discipline tabs */}
        {disciplines.length > 1 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {disciplines.map((d, i) => (
              <button key={d.discipline}
                onClick={() => { setResultsDiscIdx(i); setExpandedResult(null) }}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap flex-shrink-0 ${resultsDiscIdx === i ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>
                {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Classification / gender filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {CLASS_FILTERS.map(f => (
            <button key={f.key}
              onClick={() => { setResultsFilter(f.key); setExpandedResult(null) }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 ${resultsFilter === f.key ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {discResults.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-4xl mb-3">🏆</p>
            <p>Nav rezultātu vēl</p>
            <p className="text-sm mt-2">Punktu skaitītājs vēl nav saskaitījis punktus</p>
          </div>
        ) : (
          <div className="space-y-2">
            {discResults.map((r, idx) => (
              <div key={r.id} className={`rounded-xl border-2 ${r.status === 'disputed' ? 'border-red-600 bg-gray-800' : 'border-gray-700 bg-gray-800'}`}>
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setExpandedResult(expandedResult === r.id ? null : r.id ?? null)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      idx === 0 ? 'bg-yellow-400 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{r.shooterName}</p>
                      <p className="text-gray-500 text-xs truncate">
                        {r.club ? `${r.club} · ` : ''}{r.classification ?? 'unclassified'}
                        {r.gender === 'female' ? ' · ♀' : r.gender === 'male' ? ' · ♂' : ''}
                      </p>
                      {r.status === 'disputed' && (
                        <p className="text-red-400 text-xs">⚠️ Apstrīdēts</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-amber-400 font-mono font-bold text-lg">{r.totalScore}-{r.totalX}X</p>
                      <p className="text-gray-500 text-xs">{expandedResult === r.id ? '▲' : '▼'} detaļas</p>
                    </div>
                  </div>
                </button>
                {expandedResult === r.id && (
                  <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-1">
                    {(() => {
                      const course = ALL_COURSES.find(c => c.discipline === r.disciplineId)
                      return r.stages.map((s, i) => {
                        const stageDesc = course?.stages[i]?.description ?? `Stage ${i + 1}`
                        const label = stageDesc.split(' · ').slice(0, 2).join(' · ')
                        return (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-400">{label}</span>
                            <span className="font-mono text-white">{s.totalAfterPenalty}-{s.xCount}X</span>
                          </div>
                        )
                      })
                    })()}
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-700 font-bold">
                      <span className="text-amber-400">Kopā</span>
                      <span className="font-mono text-amber-400">{r.totalScore}-{r.totalX}X</span>
                    </div>
                    <p className="text-gray-500 text-xs pt-1">Skaitītājs: {r.scoredBy}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}