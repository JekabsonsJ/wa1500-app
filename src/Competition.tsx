import { useState } from 'react'
import type { DisciplineConfig } from './config/disciplines'
import type { HitCounts, Penalty, StageScore, Classification, Gender, WeaponCategory } from './types/scoring'
import { EMPTY_HITS, CLASSIFICATION_LABELS, GENDER_LABELS, WEAPON_CATEGORY_LABELS } from './types/scoring'
import { ALL_DISCIPLINES, getFlatStages } from './config/disciplines'
import { calculateStageScore } from './utils/scoring'
import ScoreInput from './ScoreInput'
import PrintResults from './PrintResults'
import ShooterStats from './ShooterStats'

interface Shooter {
  id: string
  name: string
  number: string
  club: string
  team: string
  gender: Gender
  classification: Classification
  weaponCategory: WeaponCategory
}

interface Relay {
  id: string
  name: string
  time: string
  shooterIds: string[]
}

interface ShooterResult {
  shooterId: string
  relayId: string
  stages: StageScore[]
  totalScore: number
  totalX: number
  confirmed: boolean
  disputed: boolean
}

type CompScreen = 'setup' | 'shooters' | 'relays' | 'relay_scoring' | 'confirm' | 'leaderboard'
type LeaderboardTab = 'all' | 'men' | 'women' | 'high_master' | 'master' | 'expert' | 'sharpshooter' | 'marksman' | 'teams'

interface Props {
  onBack: () => void
}

export default function Competition({ onBack }: Props) {
  const [screen, setScreen] = useState<CompScreen>('setup')
  const [compName, setCompName] = useState('')
  const [compDate, setCompDate] = useState('')
  const [compLocation, setCompLocation] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineConfig>(ALL_DISCIPLINES[0])
  const [shooters, setShooters] = useState<Shooter[]>([])
  const [relays, setRelays] = useState<Relay[]>([])
  const [results, setResults] = useState<ShooterResult[]>([])
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('all')
  const [showPrint, setShowPrint] = useState(false)
  const [statsShooter, setStatsShooter] = useState<Shooter | null>(null)

  // Add shooter form
  const [newName, setNewName] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [newClub, setNewClub] = useState('')
  const [newTeam, setNewTeam] = useState('')
  const [newGender, setNewGender] = useState<Gender>('male')
  const [newClassification, setNewClassification] = useState<Classification>('unclassified')
  const [newWeaponCategory, setNewWeaponCategory] = useState<WeaponCategory>('pistol_1500')

  // Add relay form
  const [newRelayName, setNewRelayName] = useState('')
  const [newRelayTime, setNewRelayTime] = useState('')

  // Scoring state
  const [activeRelay, setActiveRelay] = useState<Relay | null>(null)
  const [scoringShooter, setScoringShooter] = useState<Shooter | null>(null)
  const [currentStage, setCurrentStage] = useState(0)
  const [currentHits, setCurrentHits] = useState<HitCounts>({ ...EMPTY_HITS })
  const [currentPenalties, setCurrentPenalties] = useState<Penalty[]>([])
  const [currentStages, setCurrentStages] = useState<StageScore[]>([])

  // Confirm state
  const [confirmResult, setConfirmResult] = useState<ShooterResult | null>(null)
  const [confirmShooter, setConfirmShooter] = useState<Shooter | null>(null)

  const flatStages = getFlatStages(selectedDiscipline)

  function addShooter() {
    if (!newName.trim()) return
    setShooters([...shooters, {
      id: Date.now().toString(),
      name: newName.trim(),
      number: newNumber.trim(),
      club: newClub.trim(),
      team: newTeam.trim(),
      gender: newGender,
      classification: newClassification,
      weaponCategory: newWeaponCategory
    }])
    setNewName(''); setNewNumber(''); setNewClub(''); setNewTeam('')
    setNewGender('male'); setNewClassification('unclassified'); setNewWeaponCategory('pistol_1500')
  }

  function removeShooter(id: string) {
    setShooters(shooters.filter(s => s.id !== id))
    setRelays(relays.map(r => ({ ...r, shooterIds: r.shooterIds.filter(sid => sid !== id) })))
  }

  function addRelay() {
    if (!newRelayName.trim()) return
    setRelays([...relays, { id: Date.now().toString(), name: newRelayName.trim(), time: newRelayTime.trim(), shooterIds: [] }])
    setNewRelayName(''); setNewRelayTime('')
  }

  function toggleShooterInRelay(relayId: string, shooterId: string) {
    setRelays(relays.map(r => {
      if (r.id !== relayId) return r
      const has = r.shooterIds.includes(shooterId)
      return { ...r, shooterIds: has ? r.shooterIds.filter(id => id !== shooterId) : [...r.shooterIds, shooterId] }
    }))
  }

  function startScoring(relay: Relay, shooter: Shooter) {
    setActiveRelay(relay)
    setScoringShooter(shooter)
    setCurrentStage(0)
    setCurrentHits({ ...EMPTY_HITS })
    setCurrentPenalties([])
    setCurrentStages([])
    setScreen('relay_scoring')
  }

  function saveStage() {
    const stage = flatStages[currentStage]
    const stageScore = calculateStageScore(
      currentHits, 
      currentPenalties, 
      stage.matchIndex, 
      stage.stageIndex
    )
    const newStages = [...currentStages, stageScore]
    setCurrentStages(newStages)

    if (currentStage + 1 < flatStages.length) {
      setCurrentStage(currentStage + 1)
      setCurrentHits({ ...EMPTY_HITS })
      setCurrentPenalties([])
    } else {
      const totalScore = newStages.reduce((sum, r) => sum + r.totalAfterPenalty, 0)
      const totalX = newStages.reduce((sum, r) => sum + r.xCount, 0)
      const shooterResult: ShooterResult = {
        shooterId: scoringShooter!.id,
        relayId: activeRelay!.id,
        stages: newStages,
        totalScore,
        totalX,
        confirmed: false,
        disputed: false
      }
      setResults(prev => [...prev.filter(r => r.shooterId !== scoringShooter!.id), shooterResult])
      setConfirmResult(shooterResult)
      setConfirmShooter(scoringShooter)
      setScreen('confirm')
    }
  }

  function confirmScore(disputed: boolean) {
    if (!confirmResult) return
    setResults(prev => prev.map(r =>
      r.shooterId === confirmResult.shooterId ? { ...r, confirmed: !disputed, disputed } : r
    ))
    setScreen('relays')
  }

  function getResult(shooterId: string) {
    return results.find(r => r.shooterId === shooterId)
  }

  function getSortedResults(filtered: ShooterResult[]) {
    return [...filtered]
      .sort((a, b) => b.totalScore - a.totalScore || b.totalX - a.totalX)
      .map((r, i) => ({ place: i + 1, shooter: shooters.find(s => s.id === r.shooterId)!, result: r }))
      .filter(e => e.shooter)
  }

  function getTeamResults() {
    const confirmed = results.filter(r => r.confirmed)
    const teams: Record<string, { totalScore: number; totalX: number; members: string[] }> = {}
    confirmed.forEach(r => {
      const shooter = shooters.find(s => s.id === r.shooterId)
      if (!shooter?.team) return
      if (!teams[shooter.team]) teams[shooter.team] = { totalScore: 0, totalX: 0, members: [] }
      teams[shooter.team].totalScore += r.totalScore
      teams[shooter.team].totalX += r.totalX
      teams[shooter.team].members.push(shooter.name)
    })
    return Object.entries(teams)
      .sort(([, a], [, b]) => b.totalScore - a.totalScore || b.totalX - a.totalX)
      .map(([name, data], i) => ({ place: i + 1, teamName: name, ...data }))
  }

  function getLeaderboard() {
    const confirmed = results.filter(r => r.confirmed)
    switch (activeTab) {
      case 'men': return getSortedResults(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.gender === 'male'))
      case 'women': return getSortedResults(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.gender === 'female'))
      case 'high_master': return getSortedResults(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'high_master'))
      case 'master': return getSortedResults(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'master'))
      case 'expert': return getSortedResults(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'expert'))
      case 'sharpshooter': return getSortedResults(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'sharpshooter'))
      case 'marksman': return getSortedResults(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'marksman'))
      case 'teams': return getTeamResults()
      default: return getSortedResults(confirmed)
    }
  }

  // Stats screen
  if (statsShooter) {
    const statsResult = results.find(r => r.shooterId === statsShooter.id)
    if (statsResult) {
      return (
        <ShooterStats
          shooter={statsShooter}
          result={{
            shooterId: statsResult.shooterId,
            stages: statsResult.stages.map((s, i) => ({
              stageNumber: i + 1,
              score: {
                x: s.hits.x, ten: s.hits.ten, nine: s.hits.nine,
                eight: s.hits.eight, seven: s.hits.seven,
                zero: s.hits.zero, miss: s.hits.miss,
                penalty: s.penalties.reduce((sum, p) => sum + p.count, 0)
              },
              matchScore: s.totalAfterPenalty
            })),
            totalScore: statsResult.totalScore,
            totalX: statsResult.totalX,
            confirmed: statsResult.confirmed,
            disputed: statsResult.disputed
          }}
          course={selectedDiscipline as any}
          allResults={results.map(r => ({
            shooterId: r.shooterId,
            stages: r.stages.map((s, i) => ({
              stageNumber: i + 1,
              score: {
                x: s.hits.x, ten: s.hits.ten, nine: s.hits.nine,
                eight: s.hits.eight, seven: s.hits.seven,
                zero: s.hits.zero, miss: s.hits.miss,
                penalty: s.penalties.reduce((sum, p) => sum + p.count, 0)
              },
              matchScore: s.totalAfterPenalty
            })),
            totalScore: r.totalScore,
            totalX: r.totalX,
            confirmed: r.confirmed,
            disputed: r.disputed
          }))}
          allShooters={shooters}
          onBack={() => setStatsShooter(null)}
        />
      )
    }
  }

  // Print screen
  if (showPrint) {
    return (
      <PrintResults
        compName={compName}
        compDate={compDate}
        course={selectedDiscipline as any}
        shooters={shooters}
        results={results.map(r => ({
          shooterId: r.shooterId,
          totalScore: r.totalScore,
          totalX: r.totalX,
          confirmed: r.confirmed
        }))}
        onBack={() => setShowPrint(false)}
      />
    )
  }

  // 1. Setup
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={onBack} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>
        <h2 className="text-2xl font-bold text-amber-400 mb-6">Jauna Sacensība</h2>
        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Nosaukums *</label>
          <input type="text" value={compName} onChange={e => setCompName(e.target.value)}
            placeholder="Sacensību nosaukums..."
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
        </div>
        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Datums</label>
          <input type="date" value={compDate} onChange={e => setCompDate(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
        </div>
        <div className="mb-4">
          <label className="text-gray-400 text-sm block mb-2">Vieta</label>
          <input type="text" value={compLocation} onChange={e => setCompLocation(e.target.value)}
            placeholder="Vieta..."
            className="w-full bg-gray-800 text-white rounded-xl p-4 text-lg border border-gray-700 focus:border-amber-500 outline-none" />
        </div>
        <div className="mb-6">
          <label className="text-gray-400 text-sm block mb-2">Disciplīna</label>
          <div className="grid grid-cols-1 gap-2">
            {ALL_DISCIPLINES.map(disc => (
              <button key={disc.id} onClick={() => setSelectedDiscipline(disc)}
                className={`py-3 px-4 rounded-xl text-sm font-bold border-2 text-left ${selectedDiscipline.id === disc.id ? 'border-amber-500 bg-amber-500 text-black' : 'border-gray-700 bg-gray-800 text-white'}`}>
                <div className="font-bold">{disc.name}</div>
                <div className="text-xs opacity-75">{disc.totalShots} šāvieni · {disc.maxScore} max punkti</div>
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setScreen('shooters')} disabled={!compName.trim()}
          className={`w-full py-5 rounded-xl text-xl font-bold ${compName.trim() ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          Turpināt → Dalībnieki
        </button>
      </div>
    )
  }

  // 2. Shooters
  if (screen === 'shooters') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('setup')} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
        <h2 className="text-xl font-bold text-amber-400 mb-4">Dalībnieki — {compName}</h2>
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <h3 className="text-amber-400 font-bold mb-3">Pievienot dalībnieku</h3>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Vārds Uzvārds *"
            className="w-full bg-gray-700 text-white rounded-xl p-3 mb-2 border border-gray-600 focus:border-amber-500 outline-none" />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="text" value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="Nr."
              className="bg-gray-700 text-white rounded-xl p-3 border border-gray-600 focus:border-amber-500 outline-none" />
            <input type="text" value={newClub} onChange={e => setNewClub(e.target.value)} placeholder="Klubs"
              className="bg-gray-700 text-white rounded-xl p-3 border border-gray-600 focus:border-amber-500 outline-none" />
          </div>
          <input type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="Komanda"
            className="w-full bg-gray-700 text-white rounded-xl p-3 mb-2 border border-gray-600 focus:border-amber-500 outline-none" />
          
          {/* Gender */}
          <div className="mb-2">
            <p className="text-gray-400 text-sm mb-1">Dzimums</p>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as Gender[]).map(g => (
                <button key={g} onClick={() => setNewGender(g)}
                  className={`py-2 rounded-xl font-bold ${newGender === g ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>
                  {GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          {/* Classification */}
          <div className="mb-3">
            <p className="text-gray-400 text-sm mb-1">Klase (Classification)</p>
            <div className="grid grid-cols-3 gap-2">
              {(['unclassified', 'marksman', 'sharpshooter', 'expert', 'master', 'high_master'] as Classification[]).map(c => (
                <button key={c} onClick={() => setNewClassification(c)}
                  className={`py-2 rounded-xl font-bold text-xs ${newClassification === c ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>
                  {CLASSIFICATION_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <button onClick={addShooter} disabled={!newName.trim()}
            className={`w-full py-3 rounded-xl font-bold ${newName.trim() ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500'}`}>
            + Pievienot
          </button>
        </div>
        <div className="space-y-2 mb-6">
          {shooters.map((s, i) => (
            <div key={s.id} className="bg-gray-800 rounded-xl p-3 flex justify-between items-center">
              <div>
                <span className="text-amber-400 font-bold mr-2">{i + 1}.</span>
                <span className="font-bold">{s.name}</span>
                <span className="text-gray-400 text-sm ml-2">
                  {GENDER_LABELS[s.gender]}
                  {s.classification !== 'unclassified' ? ` · ${CLASSIFICATION_LABELS[s.classification]}` : ''}
                  {s.club ? ` · ${s.club}` : ''}
                  {s.team ? ` · 👥${s.team}` : ''}
                </span>
              </div>
              <button onClick={() => removeShooter(s.id)} className="text-red-400 px-2">✕</button>
            </div>
          ))}
        </div>
        <button onClick={() => setScreen('relays')} disabled={shooters.length === 0}
          className={`w-full py-5 rounded-xl text-xl font-bold ${shooters.length > 0 ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
          Turpināt → Maiņas ({shooters.length} dalībnieki)
        </button>
      </div>
    )
  }

  // 3. Relays
  if (screen === 'relays') {
    const disputed = results.filter(r => r.disputed)
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={() => setScreen('shooters')} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
        <h2 className="text-xl font-bold text-amber-400 mb-4">Maiņas — {compName}</h2>

        {disputed.length > 0 && (
          <div className="bg-red-800 rounded-xl p-4 mb-4">
            <p className="font-bold text-red-200 mb-2">⚠️ Apstrīdēti rezultāti: {disputed.length}</p>
            {disputed.map(r => {
              const s = shooters.find(sh => sh.id === r.shooterId)
              return (
                <div key={r.shooterId} className="flex justify-between items-center mt-2 bg-red-900 rounded-lg p-2">
                  <span className="font-bold">{s?.name}</span>
                  <span className="font-mono">{r.totalScore}-{r.totalX}X</span>
                  <div className="flex gap-2">
                    <button onClick={() => setResults(prev => prev.map(res => res.shooterId === r.shooterId ? { ...res, confirmed: true, disputed: false } : res))}
                      className="bg-green-600 px-3 py-1 rounded-lg text-sm font-bold">✓</button>
                    <button onClick={() => setResults(prev => prev.filter(res => res.shooterId !== r.shooterId))}
                      className="bg-red-600 px-3 py-1 rounded-lg text-sm font-bold">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <h3 className="text-amber-400 font-bold mb-3">Pievienot maiņu</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input type="text" value={newRelayName} onChange={e => setNewRelayName(e.target.value)}
              placeholder="Maiņas nosaukums"
              className="bg-gray-700 text-white rounded-xl p-3 border border-gray-600 focus:border-amber-500 outline-none" />
            <input type="time" value={newRelayTime} onChange={e => setNewRelayTime(e.target.value)}
              className="bg-gray-700 text-white rounded-xl p-3 border border-gray-600 focus:border-amber-500 outline-none" />
          </div>
          <button onClick={addRelay} disabled={!newRelayName.trim()}
            className={`w-full py-3 rounded-xl font-bold ${newRelayName.trim() ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-500'}`}>
            + Pievienot maiņu
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {relays.map(relay => (
            <div key={relay.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-bold text-lg">{relay.name}</h3>
                  {relay.time && <p className="text-amber-400 text-sm">🕐 {relay.time}</p>}
                </div>
                <span className="text-gray-400 text-sm">{relay.shooterIds.length}/12 šāvēji</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {shooters.map(shooter => (
                  <button key={shooter.id} onClick={() => toggleShooterInRelay(relay.id, shooter.id)}
                    className={`py-2 px-3 rounded-lg text-sm font-bold text-left ${relay.shooterIds.includes(shooter.id) ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>
                    {shooter.name}
                  </button>
                ))}
              </div>
              {relay.shooterIds.length > 0 && (
                <div className="space-y-2 mt-3 border-t border-gray-700 pt-3">
                  <p className="text-gray-400 text-sm font-bold">Rezultāti:</p>
                  {relay.shooterIds.map(sid => {
                    const shooter = shooters.find(s => s.id === sid)!
                    const result = getResult(sid)
                    return (
                      <div key={sid} className="flex justify-between items-center">
                        <span className="text-sm">{shooter.name}
                          {shooter.classification !== 'unclassified' && <span className="text-gray-400 text-xs ml-1">({CLASSIFICATION_LABELS[shooter.classification]})</span>}
                        </span>
                        {result ? (
                          <span className={`font-mono text-sm font-bold ${result.confirmed ? 'text-green-400' : result.disputed ? 'text-red-400' : 'text-yellow-400'}`}>
                            {result.confirmed ? '✓' : result.disputed ? '⚠️' : '⏳'} {result.totalScore}-{result.totalX}X
                          </span>
                        ) : (
                          <button onClick={() => startScoring(relay, shooter)}
                            className="bg-amber-500 text-black px-3 py-1 rounded-lg text-sm font-bold">
                            Ievadīt
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {results.filter(r => r.confirmed).length > 0 && (
          <button onClick={() => setScreen('leaderboard')}
            className="w-full py-4 rounded-xl text-xl font-bold bg-green-600 text-white mb-3">
            🏆 Rezultātu tabula
          </button>
        )}
        <button onClick={onBack} className="w-full py-4 rounded-xl text-xl font-bold bg-gray-700 text-white">
          Uz Sākumu
        </button>
      </div>
    )
  }

  // 4. Scoring
  if (screen === 'relay_scoring' && scoringShooter) {
    const stage = flatStages[currentStage]
    return (
      <div>
        <div className="bg-gray-800 p-3 text-center">
          <p className="text-amber-400 font-bold">Skaitītājs ievada: <span className="text-white">{scoringShooter.name}</span></p>
          <p className="text-gray-400 text-sm">{stage.matchLabel} · {stage.label}</p>
        </div>
        <ScoreInput
          stage={{
            stageNumber: stage.globalIndex + 1,
            distance: stage.distance,
            shots: stage.shots,
            timeSeconds: stage.timeSeconds,
            description: stage.notes || `${stage.positions.join(', ')}`
          }}
          hits={currentHits}
          penalties={currentPenalties}
          onChange={(h, p) => { setCurrentHits(h); setCurrentPenalties(p) }}
          onSave={saveStage}
          onBack={() => {
            if (currentStage === 0) {
              setScreen('relays')
            } else {
              const prev = currentStages[currentStage - 1]
              setCurrentStage(currentStage - 1)
              setCurrentHits({ ...prev.hits })
              setCurrentPenalties([...prev.penalties])
              setCurrentStages(currentStages.slice(0, -1))
            }
          }}
        />
      </div>
    )
  }

  // 5. Confirm
  if (screen === 'confirm' && confirmResult && confirmShooter) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col">
        <div className="bg-amber-500 text-black rounded-xl p-4 mb-6 text-center">
          <p className="text-sm font-bold">NODOD IERĪCI ŠĀVĒJAM</p>
          <p className="text-2xl font-bold mt-1">{confirmShooter.name}</p>
          <p className="text-sm">{CLASSIFICATION_LABELS[confirmShooter.classification]} · {GENDER_LABELS[confirmShooter.gender]}</p>
        </div>
        <h2 className="text-xl font-bold text-center mb-4">Apstipriniet savus rezultātus</h2>
        <div className="bg-gray-800 rounded-xl p-6 mb-4 text-center">
          <p className="text-gray-400 text-sm mb-2">{selectedDiscipline.name}</p>
          <p className="text-5xl font-mono font-bold text-amber-400">{confirmResult.totalScore}-{confirmResult.totalX}X</p>
          <p className="text-gray-400 text-sm mt-2">no {selectedDiscipline.maxScore}</p>
        </div>
        <div className="space-y-2 mb-6">
          {confirmResult.stages.map((r, i) => {
            const stage = flatStages[i]
            const penCount = r.penalties.reduce((sum, p) => sum + p.count, 0)
            return (
              <div key={i} className="bg-gray-800 rounded-xl p-3 flex justify-between">
                <div>
                  <span className="font-bold">{stage.matchLabel} {stage.label}</span>
                  <span className="text-gray-400 text-sm ml-2">{stage.distance}{stage.distanceUnit}</span>
                  {penCount > 0 && <span className="text-red-400 text-xs ml-2">⚠️ {penCount} pen.</span>}
                </div>
                <span className="font-mono font-bold text-amber-400">{r.totalAfterPenalty}-{r.xCount}X</span>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button onClick={() => confirmScore(true)} className="py-5 rounded-xl text-lg font-bold bg-red-600 text-white">⚠️ Apstrīdēt</button>
          <button onClick={() => confirmScore(false)} className="py-5 rounded-xl text-lg font-bold bg-green-600 text-white">✓ Apstiprināt</button>
        </div>
      </div>
    )
  }

  // 6. Leaderboard
  const leaderboard = getLeaderboard()
  const tabs: { key: LeaderboardTab; label: string }[] = [
    { key: 'all', label: 'Visi' },
    { key: 'men', label: 'Vīrieši' },
    { key: 'women', label: 'Sievietes' },
    { key: 'high_master', label: 'High Master' },
    { key: 'master', label: 'Master' },
    { key: 'expert', label: 'Expert' },
    { key: 'sharpshooter', label: 'Sharpshooter' },
    { key: 'marksman', label: 'Marksman' },
    { key: 'teams', label: '👥 Komandas' },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setScreen('relays')} className="text-amber-400 text-lg">← Atpakaļ</button>
        <button onClick={() => setShowPrint(true)} className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold text-sm">🖨️ Drukāt</button>
      </div>
      <h2 className="text-xl font-bold text-amber-400 mb-1">Rezultātu tabula</h2>
      <p className="text-gray-400 text-sm mb-4">{compName} · {selectedDiscipline.name} · {compDate}</p>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === tab.key ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'teams' ? (
        <div className="space-y-2">
          {(leaderboard as ReturnType<typeof getTeamResults>).map(entry => (
            <div key={entry.teamName}
              className={`rounded-xl p-4 ${entry.place === 1 ? 'bg-amber-500 text-black' : entry.place === 2 ? 'bg-gray-400 text-black' : entry.place === 3 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-white'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold w-8">{entry.place}.</span>
                <div className="flex-1">
                  <p className="font-bold">👥 {entry.teamName}</p>
                  <p className="text-sm opacity-75">{entry.members.join(', ')}</p>
                </div>
                <p className="text-xl font-mono font-bold">{entry.totalScore}-{entry.totalX}X</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(leaderboard as ReturnType<typeof getSortedResults>).map(entry => (
            <div key={entry.shooter.id}
              className={`rounded-xl p-4 flex items-center gap-3 ${entry.place === 1 ? 'bg-amber-500 text-black' : entry.place === 2 ? 'bg-gray-400 text-black' : entry.place === 3 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-white'}`}>
              <span className="text-2xl font-bold w-8">{entry.place}.</span>
              <div className="flex-1">
                <p className="font-bold">{entry.shooter.name}</p>
                <p className="text-sm opacity-75">
                  {entry.shooter.club}
                  {entry.shooter.classification !== 'unclassified' ? ` · ${CLASSIFICATION_LABELS[entry.shooter.classification]}` : ''}
                  {entry.shooter.team ? ` · 👥${entry.shooter.team}` : ''}
                </p>
              </div>
              <button onClick={() => setStatsShooter(entry.shooter)}
                className="text-xl font-mono font-bold underline">
                {entry.result.totalScore}-{entry.result.totalX}X
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}