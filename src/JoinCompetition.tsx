import { useState, useEffect } from 'react'
import {
  getCompetitionByCode,
  registerForCompetition,
  updateRegistration,
  subscribeToRegistration,
  subscribeToShooterResults
} from './firebaseService'
import type { FirebaseCompetition, FirebaseRegistration, FirebaseResult } from './firebaseService'
import type { Classification, Gender, WeaponCategory } from './types/scoring'
import { CLASSIFICATION_LABELS, GENDER_LABELS, WEAPON_CATEGORY_LABELS } from './types/scoring'
import { registerShooter } from './registrationService'
import { ALL_COURSES } from './types'

type JoinScreen = 'registrations' | 'search' | 'register' | 'confirmed'

interface LocalRegistration {
  competitionId: string
  competitionName: string
  shooterId: string
  registeredAt: string
}

interface SelectedEntry {
  disciplineIdx: number
  relayId: string
  classification: Classification
  weaponCategory: WeaponCategory
}

interface Props {
  onBack: () => void
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-600 text-white',
  pending: 'bg-yellow-600 text-black',
  cancelled: 'bg-red-700 text-white',
}
const STATUS_LABELS: Record<string, string> = {
  confirmed: '✅ Apstiprināts',
  pending: '⏳ Gaida apstiprinājumu',
  cancelled: '❌ Atcelts',
}

function loadMyIds(): Set<string> {
  try {
    const stored = localStorage.getItem('myShooterIds')
    return new Set(stored ? JSON.parse(stored) : [])
  } catch {
    return new Set()
  }
}

function saveMyIds(ids: Set<string>) {
  localStorage.setItem('myShooterIds', JSON.stringify([...ids]))
}

export default function JoinCompetition({ onBack }: Props) {
  const [screen, setScreen] = useState<JoinScreen>('registrations')

  const [savedRegs, setSavedRegs] = useState<LocalRegistration[]>([])
  const [firebaseRegs, setFirebaseRegs] = useState<Record<string, FirebaseRegistration | null>>({})
  const [shooterResults, setShooterResults] = useState<Record<string, FirebaseResult[]>>({})
  // Set of shooterIds marked as "mine"
  const [myIds, setMyIds] = useState<Set<string>>(new Set())
  // When true, show only "mine"
  const [filterMine, setFilterMine] = useState(true)

  // Search / Register screen
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [event, setEvent] = useState<FirebaseCompetition | null>(null)
  const [registration, setRegistration] = useState<FirebaseRegistration | null>(null)

  // Registration form
  const [shooterName, setShooterName] = useState('')
  const [club, setClub] = useState('')
  const [team, setTeam] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [selectedEntries, setSelectedEntries] = useState<SelectedEntry[]>([])

  useEffect(() => {
    setMyIds(loadMyIds())
    const stored = localStorage.getItem('myRegistrations')
    if (!stored) return
    try {
      setSavedRegs(JSON.parse(stored) as LocalRegistration[])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (savedRegs.length === 0) return
    const unsubs: (() => void)[] = []
    savedRegs.forEach(reg => {
      const key = reg.shooterId
      const unsubReg = subscribeToRegistration(reg.competitionId, reg.shooterId, fbReg => {
        setFirebaseRegs(prev => ({ ...prev, [key]: fbReg }))
      })
      const unsubRes = subscribeToShooterResults(reg.competitionId, reg.shooterId, res => {
        setShooterResults(prev => ({ ...prev, [key]: res }))
      })
      unsubs.push(unsubReg, unsubRes)
    })
    return () => unsubs.forEach(u => u())
  }, [savedRegs])

  useEffect(() => {
    if (screen === 'confirmed' && registration?.id && event?.id) {
      const unsub = subscribeToRegistration(event.id, registration.id, updatedReg => {
        if (updatedReg) setRegistration(updatedReg)
      })
      return unsub
    }
  }, [screen, registration?.id, event?.id])

  function toggleMine(shooterId: string) {
    setMyIds(prev => {
      const next = new Set(prev)
      if (next.has(shooterId)) next.delete(shooterId)
      else next.add(shooterId)
      saveMyIds(next)
      return next
    })
  }

  async function searchEvent() {
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const found = await getCompetitionByCode(code.trim())
      if (!found) {
        setError('Nav atrasta neviena sacensība ar šo kodu.')
      } else {
        setEvent(found)
        setScreen('register')
      }
    } catch {
      setError('Kļūda meklējot sacensību.')
    }
    setLoading(false)
  }

  function toggleEntry(disciplineIdx: number, relayId: string) {
    setSelectedEntries(prev => {
      const exists = prev.find(e => e.disciplineIdx === disciplineIdx && e.relayId === relayId)
      if (exists) return prev.filter(e => !(e.disciplineIdx === disciplineIdx && e.relayId === relayId))
      const filtered = prev.filter(e => e.disciplineIdx !== disciplineIdx)
      return [...filtered, { disciplineIdx, relayId, classification: 'unclassified', weaponCategory: 'pistol_1500' }]
    })
  }

  function setEntryClassification(disciplineIdx: number, relayId: string, classification: Classification) {
    setSelectedEntries(prev => prev.map(e =>
      e.disciplineIdx === disciplineIdx && e.relayId === relayId ? { ...e, classification } : e
    ))
  }

  function setEntryWeaponCategory(disciplineIdx: number, relayId: string, weaponCategory: WeaponCategory) {
    setSelectedEntries(prev => prev.map(e =>
      e.disciplineIdx === disciplineIdx && e.relayId === relayId ? { ...e, weaponCategory } : e
    ))
  }

  function isSelected(disciplineIdx: number, relayId: string) {
    return selectedEntries.some(e => e.disciplineIdx === disciplineIdx && e.relayId === relayId)
  }

  function getEntry(disciplineIdx: number, relayId: string): SelectedEntry | undefined {
    return selectedEntries.find(e => e.disciplineIdx === disciplineIdx && e.relayId === relayId)
  }

  async function handleRegister() {
    if (!shooterName.trim() || selectedEntries.length === 0 || !event) return
    setLoading(true)
    try {
      const disciplines = selectedEntries.map(se => {
        const disc = event.disciplines[se.disciplineIdx]
        const relay = disc.relays.find(r => r.id === se.relayId)!
        return {
          discipline: disc.discipline,
          disciplineName: disc.name,
          relayId: relay.id,
          relayName: relay.name,
          relayTime: relay.time,
          classification: se.classification,
          weaponCategory: se.weaponCategory
        }
      })

      const regId = await registerForCompetition(event.id!, {
        eventCode: event.code,
        eventName: event.name,
        shooterName: shooterName.trim(),
        club: club.trim(),
        gender,
        shooterClass: 'none',
        team: team.trim(),
        disciplines,
        status: 'pending'
      })

      const firstDiscipline = disciplines[0]
      try {
        await registerShooter(regId, event.id!, event.name,
          firstDiscipline.discipline, firstDiscipline.disciplineName,
          firstDiscipline.relayId, firstDiscipline.relayName, firstDiscipline.relayTime)
      } catch (err) {
        console.error('ERROR in registerShooter:', err)
      }

      // Save to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('myRegistrations') || '[]')
        stored.push({ competitionId: event.id!, competitionName: event.name, shooterId: regId, registeredAt: new Date().toISOString() })
        localStorage.setItem('myRegistrations', JSON.stringify(stored))
        setSavedRegs(stored)
      } catch (err) {
        console.error('localStorage error:', err)
      }

      // Auto-mark this registration as "mine"
      setMyIds(prev => {
        const next = new Set(prev)
        next.add(regId)
        saveMyIds(next)
        return next
      })

      setRegistration({
        id: regId, competitionId: event.id!, eventCode: event.code, eventName: event.name,
        shooterName: shooterName.trim(), club: club.trim(), gender, shooterClass: 'none',
        team: team.trim(), disciplines, status: 'pending'
      })
      setScreen('confirmed')
    } catch (err) {
      console.error('Registration ERROR:', err)
      alert('Kļūda reģistrējoties!')
    }
    setLoading(false)
  }

  async function handleCancelRegistration() {
    if (!registration?.id || !confirm('Atcelt savu reģistrāciju?')) return
    setLoading(true)
    try {
      await updateRegistration(event!.id!, registration.id!, { status: 'cancelled' })
    } catch {
      alert('Kļūda atceļot reģistrāciju!')
    }
    setLoading(false)
  }

  // ─── MY REGISTRATIONS SCREEN ────────────────────────────────────────────────
  if (screen === 'registrations') {
    const visibleRegs = filterMine
      ? savedRegs.filter(r => myIds.has(r.shooterId))
      : savedRegs

    const hasMine = savedRegs.some(r => myIds.has(r.shooterId))
    const hasOthers = savedRegs.some(r => !myIds.has(r.shooterId))

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={onBack} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Manas Sacensības</h2>

        {/* Filter toggle — only show if there are both "mine" and "others" */}
        {savedRegs.length > 0 && (hasMine || hasOthers) && (
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setFilterMine(true)}
              className={`flex-1 py-2 rounded-xl font-bold text-sm ${filterMine ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
              🎯 Tikai mani
            </button>
            <button
              onClick={() => setFilterMine(false)}
              className={`flex-1 py-2 rounded-xl font-bold text-sm ${!filterMine ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
              👥 Visi ({savedRegs.length})
            </button>
          </div>
        )}

        {visibleRegs.length === 0 && filterMine && savedRegs.length > 0 ? (
          <div className="bg-gray-800 rounded-xl p-6 text-center mb-6">
            <p className="text-gray-400 mb-2">Nav atzīmētu pieteikumu</p>
            <p className="text-gray-500 text-sm mb-4">Nospied "Mans" uz katras kartītes, kas pieder tev</p>
            <button onClick={() => setFilterMine(false)} className="text-amber-400 underline text-sm">
              Skatīt visus →
            </button>
          </div>
        ) : visibleRegs.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center mb-6">
            <p className="text-gray-400 text-lg mb-2">Nav saglabātu pieteikumu</p>
            <p className="text-gray-500 text-sm">Pieteikties sacensībai ar 6-ciparu kodu</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {visibleRegs.map(reg => {
              const fbReg = firebaseRegs[reg.shooterId]
              const status = fbReg?.status ?? 'pending'
              const isMine = myIds.has(reg.shooterId)
              return (
                <div key={reg.shooterId} className={`rounded-xl p-4 border-2 ${isMine ? 'bg-gray-800 border-amber-600' : 'bg-gray-800 border-gray-700'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-amber-400 font-bold text-lg leading-tight">{reg.competitionName}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Pieteikts: {new Date(reg.registeredAt).toLocaleDateString('lv-LV')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[status] ?? STATUS_COLORS.pending}`}>
                        {STATUS_LABELS[status] ?? '⏳ Gaida'}
                      </span>
                      <button
                        onClick={() => toggleMine(reg.shooterId)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border ${isMine ? 'bg-amber-500 border-amber-500 text-black' : 'bg-transparent border-gray-500 text-gray-400'}`}>
                        {isMine ? '👤 Mans' : '+ Mans'}
                      </button>
                    </div>
                  </div>

                  {fbReg === undefined ? (
                    <p className="text-gray-500 text-sm mt-2">Ielādē...</p>
                  ) : fbReg === null ? (
                    <p className="text-gray-500 text-sm italic mt-2">Reģistrācija nav atrasta</p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <p className="text-gray-400 text-xs">🎯 {fbReg.shooterName}{fbReg.club ? ` · ${fbReg.club}` : ''}</p>
                      {fbReg.disciplines.map((d, i) => (
                        <div key={i} className="bg-gray-700 rounded-lg p-3">
                          <p className="text-white font-bold text-sm mb-1">📋 {d.disciplineName}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <span className="text-gray-300">👥 {d.relayName}</span>
                            {d.relayTime && (
                              <span className="text-amber-400 font-bold font-mono">🕐 {d.relayTime}</span>
                            )}
                            {(d as any).classification && (
                              <span className="text-gray-400">{CLASSIFICATION_LABELS[(d as any).classification as Classification]}</span>
                            )}
                            {(d as any).weaponCategory && (
                              <span className="text-gray-400">{WEAPON_CATEGORY_LABELS[(d as any).weaponCategory as WeaponCategory]}</span>
                            )}
                          </div>
                          {/* Show result for this discipline if available */}
                          {(() => {
                            const res = (shooterResults[reg.shooterId] ?? []).find(r => r.disciplineId === d.discipline)
                            if (!res) return null
                            const course = ALL_COURSES.find(c => c.discipline === d.discipline)
                            return (
                              <div className={`mt-2 rounded-lg p-2 ${res.status === 'disputed' ? 'bg-red-900' : 'bg-green-900'}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-300">🏆 Rezultāts</span>
                                  {res.status === 'disputed' && (
                                    <span className="text-red-300 text-xs font-bold">⚠️ Apstrīdēts</span>
                                  )}
                                </div>
                                <p className="text-amber-400 font-mono font-bold text-xl mt-0.5">{res.totalScore}-{res.totalX}X</p>
                                <div className="space-y-0.5 mt-1">
                                  {res.stages.map((s, si) => {
                                    const stageDesc = course?.stages[si]?.description ?? `Stage ${si + 1}`
                                    const label = stageDesc.split(' · ').slice(0, 2).join(' · ')
                                    return (
                                      <div key={si} className="flex justify-between text-xs">
                                        <span className="text-gray-400">{label}</span>
                                        <span className="text-gray-200 font-mono">{s.totalAfterPenalty}-{s.xCount}X</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => { setCode(''); setError(''); setScreen('search') }}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-5 rounded-xl text-xl">
          + Pieslēgties jaunai sacensībai
        </button>
      </div>
    )
  }

  // ─── SEARCH SCREEN ──────────────────────────────────────────────────────────
  if (screen === 'search') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('registrations')} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>
        <h2 className="text-2xl font-bold text-amber-400 mb-6">Pieslēgties Sacensībai</h2>
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <p className="text-gray-400 text-sm mb-4 text-center">Ievadiet 6 ciparu kodu no organizatora</p>
          <input
            type="number"
            value={code}
            onChange={e => setCode(e.target.value.slice(0, 6))}
            placeholder="000000"
            className="w-full bg-gray-700 text-white rounded-xl p-4 text-3xl font-mono text-center border border-gray-600 focus:border-amber-500 outline-none tracking-widest"
          />
          {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        </div>
        <button onClick={searchEvent} disabled={code.length !== 6 || loading}
          className={`w-full py-5 rounded-xl text-xl font-bold ${code.length === 6 && !loading ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          {loading ? 'Meklē...' : 'Meklēt →'}
        </button>
      </div>
    )
  }

  // ─── REGISTER SCREEN ────────────────────────────────────────────────────────
  if (screen === 'register' && event) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('search')} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h2 className="text-xl font-bold text-amber-400">{event.name}</h2>
          <p className="text-gray-400 mt-1">📅 {event.date}</p>
          <p className="text-gray-400">📍 {event.location}</p>
        </div>

        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Vārds Uzvārds *</label>
          <input type="text" value={shooterName} onChange={e => setShooterName(e.target.value)}
            placeholder="Vārds Uzvārds..."
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <input type="text" value={club} onChange={e => setClub(e.target.value)}
            placeholder="Klubs"
            className="bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-amber-500 outline-none" />
          <input type="text" value={team} onChange={e => setTeam(e.target.value)}
            placeholder="Komanda"
            className="bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-amber-500 outline-none" />
        </div>

        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-2">Dzimums</p>
          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female'] as Gender[]).map(g => (
              <button key={g} onClick={() => setGender(g)}
                className={`py-2 rounded-xl font-bold ${gender === g ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>
                {GENDER_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3 font-bold">Izvēlieties disciplīnas un maiņas *</p>
          {event.disciplines.map((disc, dIdx) => (
            <div key={disc.discipline} className="bg-gray-800 rounded-xl p-4 mb-3">
              <h3 className="text-amber-400 font-bold mb-3">{disc.name}</h3>
              {disc.relays.length === 0 ? (
                <p className="text-gray-500 text-sm">Nav maiņu</p>
              ) : (
                <div className="space-y-3">
                  {disc.relays.map(relay => {
                    const selected = isSelected(dIdx, relay.id)
                    const entry = getEntry(dIdx, relay.id)
                    return (
                      <div key={relay.id} className={`rounded-xl border-2 p-3 ${selected ? 'border-amber-500 bg-gray-700' : 'border-gray-700 bg-gray-700'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => toggleEntry(dIdx, relay.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-amber-500 border-amber-500' : 'border-gray-500'}`}>
                            {selected && <span className="text-black font-bold text-sm">✓</span>}
                          </button>
                          <div className="flex-1">
                            <span className="font-bold">{relay.name}</span>
                            {relay.time && <span className="text-amber-400 text-sm ml-2">🕐 {relay.time}</span>}
                            <span className="text-gray-400 text-xs ml-2">max {relay.maxShooters}</span>
                          </div>
                        </div>
                        {selected && entry && (
                          <div className="ml-9 space-y-2">
                            <div>
                              <p className="text-gray-400 text-xs mb-1">Klase:</p>
                              <div className="grid grid-cols-3 gap-1">
                                {(['unclassified', 'marksman', 'sharpshooter', 'expert', 'master', 'high_master'] as Classification[]).map(c => (
                                  <button key={c}
                                    onClick={() => setEntryClassification(dIdx, relay.id, c)}
                                    className={`py-1 rounded-lg text-xs font-bold ${entry.classification === c ? 'bg-amber-500 text-black' : 'bg-gray-600 text-white'}`}>
                                    {CLASSIFICATION_LABELS[c]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs mb-1">Ieroča kategorija:</p>
                              <select
                                value={entry.weaponCategory}
                                onChange={e => setEntryWeaponCategory(dIdx, relay.id, e.target.value as WeaponCategory)}
                                className="w-full bg-gray-600 text-white rounded-lg p-2 text-sm border border-gray-500 focus:border-amber-500 outline-none">
                                {Object.entries(WEAPON_CATEGORY_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedEntries.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <p className="text-amber-400 font-bold mb-2">Izvēlētās disciplīnas:</p>
            {selectedEntries.map((se, i) => {
              const disc = event.disciplines[se.disciplineIdx]
              const relay = disc.relays.find(r => r.id === se.relayId)!
              return (
                <p key={i} className="text-sm text-gray-300">
                  ✓ {disc.name} · {relay.name} {relay.time && `🕐 ${relay.time}`}
                  {` · ${CLASSIFICATION_LABELS[se.classification]}`}
                  {` · ${WEAPON_CATEGORY_LABELS[se.weaponCategory]}`}
                </p>
              )
            })}
          </div>
        )}

        <button onClick={handleRegister}
          disabled={!shooterName.trim() || selectedEntries.length === 0 || loading}
          className={`w-full py-5 rounded-xl text-xl font-bold ${shooterName.trim() && selectedEntries.length > 0 && !loading ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          {loading ? 'Reģistrē...' : `Pieteikties (${selectedEntries.length} disciplīnas) →`}
        </button>
      </div>
    )
  }

  // ─── CONFIRMED SCREEN ───────────────────────────────────────────────────────
  if (screen === 'confirmed' && registration && event) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className={`rounded-xl p-4 mb-6 text-center ${registration.status === 'confirmed' ? 'bg-green-700' : registration.status === 'cancelled' ? 'bg-red-700' : 'bg-yellow-700'}`}>
          <p className="text-2xl font-bold">
            {registration.status === 'confirmed' ? '✅ Apstiprināts!' :
             registration.status === 'cancelled' ? '❌ Atcelts' :
             '⏳ Gaida apstiprinājumu'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <h2 className="text-xl font-bold text-amber-400 mb-2">{event.name}</h2>
          <p className="text-gray-400">📅 {event.date}</p>
          <p className="text-gray-400">📍 {event.location}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <h3 className="text-amber-400 font-bold mb-2">Jūsu informācija</h3>
          <p className="font-bold text-lg">{registration.shooterName}</p>
          <p className="text-gray-400">{registration.club} · {GENDER_LABELS[registration.gender as Gender]}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-amber-400 font-bold mb-3">Pieteiktās disciplīnas</h3>
          {registration.disciplines.map((d, i) => (
            <div key={i} className="bg-gray-700 rounded-lg p-3 mb-2 last:mb-0">
              <p className="font-bold">{d.disciplineName}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-1">
                <span className="text-gray-300">👥 {d.relayName}</span>
                {d.relayTime && <span className="text-amber-400 font-bold font-mono">🕐 {d.relayTime}</span>}
                {(d as any).classification && (
                  <span className="text-gray-400">{CLASSIFICATION_LABELS[(d as any).classification as Classification]}</span>
                )}
                {(d as any).weaponCategory && (
                  <span className="text-gray-400">{WEAPON_CATEGORY_LABELS[(d as any).weaponCategory as WeaponCategory]}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {registration.status === 'pending' && (
          <button onClick={handleCancelRegistration} disabled={loading}
            className="w-full py-4 rounded-xl text-lg font-bold bg-red-700 text-white mb-3">
            ❌ Atcelt reģistrāciju
          </button>
        )}

        <button onClick={() => setScreen('registrations')}
          className="w-full py-4 rounded-xl text-lg font-bold bg-gray-700 text-white">
          ← Uz manas sacensības
        </button>
      </div>
    )
  }

  return null
}
