import { useState, useEffect } from 'react'
import {
  getCompetitionByCode,
  registerForCompetition,
  updateRegistration,
  subscribeToRegistration
} from './firebaseService'
import type { FirebaseCompetition, FirebaseRegistration } from './firebaseService'

type Gender = 'M' | 'F'
type ShooterClass = 'Open' | 'Master' | 'none'
type JoinScreen = 'search' | 'register' | 'confirmed'

interface SelectedEntry {
  disciplineIdx: number
  relayId: string
  shooterClass: ShooterClass
}

interface Props {
  onBack: () => void
}

export default function JoinCompetition({ onBack }: Props) {
  const [screen, setScreen] = useState<JoinScreen>('search')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [event, setEvent] = useState<FirebaseCompetition | null>(null)
  const [registration, setRegistration] = useState<FirebaseRegistration | null>(null)

  // Registration form
  const [shooterName, setShooterName] = useState('')
  const [club, setClub] = useState('')
  const [team, setTeam] = useState('')
  const [gender, setGender] = useState<Gender>('M')
  const [selectedEntries, setSelectedEntries] = useState<SelectedEntry[]>([])

  useEffect(() => {
  if (screen === 'confirmed' && registration?.id && event?.id) {
    const unsub = subscribeToRegistration(event.id, registration.id, updatedReg => {
        if (updatedReg) setRegistration(updatedReg)
      })
      return unsub
    }
  }, [screen, registration?.id])

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
      if (exists) {
        return prev.filter(e => !(e.disciplineIdx === disciplineIdx && e.relayId === relayId))
      }
      // Remove other relay for same discipline, keep others
      const filtered = prev.filter(e => e.disciplineIdx !== disciplineIdx)
      return [...filtered, { disciplineIdx, relayId, shooterClass: 'none' }]
    })
  }

  function setEntryClass(disciplineIdx: number, relayId: string, shooterClass: ShooterClass) {
    setSelectedEntries(prev => prev.map(e =>
      e.disciplineIdx === disciplineIdx && e.relayId === relayId
        ? { ...e, shooterClass }
        : e
    ))
  }

  function isSelected(disciplineIdx: number, relayId: string) {
    return selectedEntries.some(e => e.disciplineIdx === disciplineIdx && e.relayId === relayId)
  }

  function getEntryClass(disciplineIdx: number, relayId: string): ShooterClass {
    return selectedEntries.find(e => e.disciplineIdx === disciplineIdx && e.relayId === relayId)?.shooterClass || 'none'
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
          shooterClass: se.shooterClass
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

      setRegistration({
  id: regId,
  competitionId: event.id!,
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
      setScreen('confirmed')
    } catch {
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

  // Search screen
  if (screen === 'search') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={onBack} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>
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

  // Register screen
  if (screen === 'register' && event) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('search')} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h2 className="text-xl font-bold text-amber-400">{event.name}</h2>
          <p className="text-gray-400 mt-1">📅 {event.date}</p>
          <p className="text-gray-400">📍 {event.location}</p>
        </div>

        {/* Personal info */}
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
            {(['M', 'F'] as Gender[]).map(g => (
              <button key={g} onClick={() => setGender(g)}
                className={`py-2 rounded-xl font-bold ${gender === g ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>
                {g === 'M' ? '👨 Vīrietis' : '👩 Sieviete'}
              </button>
            ))}
          </div>
        </div>

        {/* Discipline + relay + class selection */}
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
                    const entryClass = getEntryClass(dIdx, relay.id)
                    return (
                      <div key={relay.id} className={`rounded-xl border-2 p-3 ${selected ? 'border-amber-500 bg-gray-700' : 'border-gray-700 bg-gray-700'}`}>
                        {/* Relay checkbox row */}
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

                        {/* Class selection - only shown when selected */}
                        {selected && (
                          <div className="ml-9">
                            <p className="text-gray-400 text-xs mb-1">Klase (nav obligāta):</p>
                            <div className="grid grid-cols-3 gap-1">
                              {(['none', 'Open', 'Master'] as ShooterClass[]).map(c => (
                                <button key={c}
                                  onClick={() => setEntryClass(dIdx, relay.id, c)}
                                  className={`py-1 rounded-lg text-sm font-bold ${entryClass === c ? 'bg-amber-500 text-black' : 'bg-gray-600 text-white'}`}>
                                  {c === 'none' ? '—' : c}
                                </button>
                              ))}
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

        {/* Summary */}
        {selectedEntries.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <p className="text-amber-400 font-bold mb-2">Izvēlētās disciplīnas:</p>
            {selectedEntries.map((se, i) => {
              const disc = event.disciplines[se.disciplineIdx]
              const relay = disc.relays.find(r => r.id === se.relayId)!
              return (
                <p key={i} className="text-sm text-gray-300">
                  ✓ {disc.name} · {relay.name} {relay.time && `🕐 ${relay.time}`}
                  {se.shooterClass !== 'none' && ` · ${se.shooterClass}`}
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

  // Confirmed screen
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
          <p className="text-gray-400">{registration.club} · {registration.gender === 'M' ? 'Vīrietis' : 'Sieviete'}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-amber-400 font-bold mb-2">Pieteiktās disciplīnas</h3>
          {registration.disciplines.map((d, i) => (
            <div key={i} className="py-2 border-b border-gray-700 last:border-0">
              <p className="font-bold">{d.disciplineName}</p>
              <p className="text-gray-400 text-sm">
                Maiņa: {d.relayName} {d.relayTime && `🕐 ${d.relayTime}`}
                {(d as any).shooterClass && (d as any).shooterClass !== 'none' && ` · ${(d as any).shooterClass}`}
              </p>
            </div>
          ))}
        </div>

        {registration.status === 'pending' && (
          <button onClick={handleCancelRegistration} disabled={loading}
            className="w-full py-4 rounded-xl text-lg font-bold bg-red-700 text-white mb-3">
            ❌ Atcelt reģistrāciju
          </button>
        )}

        <button onClick={onBack}
          className="w-full py-4 rounded-xl text-lg font-bold bg-gray-700 text-white">
          ← Uz sākumu
        </button>
      </div>
    )
  }

  return null
}