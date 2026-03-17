import type { Course } from './types'
import type { Classification, Gender } from './types/scoring'
import { CLASSIFICATION_LABELS, GENDER_LABELS } from './types/scoring'

interface Shooter {
  id: string
  name: string
  number: string
  club: string
  team: string
  gender: Gender
  classification: Classification
  weaponCategory: string
}

interface ShooterResult {
  shooterId: string
  totalScore: number
  totalX: number
  confirmed: boolean
  stages: {
    hits: {
      x: number
      ten: number
      nine: number
      eight: number
      seven: number
      zero: number
      miss: number
    }
    totalAfterPenalty: number
    xCount: number
  }[]
}

interface Props {
  compName: string
  compDate: string
  course: Course
  shooters: Shooter[]
  results: ShooterResult[]
  onBack: () => void
}

interface Entry {
  place: number
  shooter: Shooter
  totalScore: number
  totalX: number
}

export default function PrintResults({ compName, compDate, course, shooters, results, onBack }: Props) {
  const confirmed = results.filter(r => r.confirmed)

  function getSorted(filtered: ShooterResult[]): Entry[] {
    return [...filtered]
      .sort((a, b) => b.totalScore - a.totalScore || b.totalX - a.totalX)
      .map((r, i) => ({
        place: i + 1,
        shooter: shooters.find(s => s.id === r.shooterId)!,
        totalScore: r.totalScore,
        totalX: r.totalX
      }))
      .filter(e => e.shooter)
  }

  const categories = [
    { label: 'Kopvērtējums', entries: getSorted(confirmed) },
    { label: 'Vīrieši', entries: getSorted(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.gender === 'male')) },
    { label: 'Sievietes', entries: getSorted(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.gender === 'female')) },
    { label: 'High Master', entries: getSorted(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'high_master')) },
    { label: 'Master', entries: getSorted(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'master')) },
    { label: 'Expert', entries: getSorted(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'expert')) },
    { label: 'Sharpshooter', entries: getSorted(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'sharpshooter')) },
    { label: 'Marksman', entries: getSorted(confirmed.filter(r => shooters.find(s => s.id === r.shooterId)?.classification === 'marksman')) },
  ]

  // Team results
  const teams: Record<string, { totalScore: number; totalX: number; members: string[] }> = {}
  confirmed.forEach(r => {
    const shooter = shooters.find(s => s.id === r.shooterId)
    if (!shooter?.team) return
    if (!teams[shooter.team]) teams[shooter.team] = { totalScore: 0, totalX: 0, members: [] }
    teams[shooter.team].totalScore += r.totalScore
    teams[shooter.team].totalX += r.totalX
    teams[shooter.team].members.push(shooter.name)
  })
  const teamResults = Object.entries(teams)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore || b.totalX - a.totalX)
    .map(([name, data], i) => ({ place: i + 1, teamName: name, ...data }))

  function exportCSV() {
    const rows = ['Vieta,Vārds,Klubs,Komanda,Dzimums,Klase,Rezultāts,X']
    getSorted(confirmed).forEach(e => {
      rows.push(`${e.place},"${e.shooter.name}","${e.shooter.club}","${e.shooter.team}",${GENDER_LABELS[e.shooter.gender]},${CLASSIFICATION_LABELS[e.shooter.classification]},${e.totalScore},${e.totalX}`)
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${compName}_rezultati.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Action buttons - hidden on print */}
      <div className="print:hidden p-4 flex gap-3 sticky top-0 bg-gray-900 z-10 border-b border-gray-700">
        <button onClick={onBack} className="text-amber-400 text-lg">← Atpakaļ</button>
        <div className="flex gap-2 ml-auto">
          <button onClick={exportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
            📥 CSV
          </button>
          <button onClick={() => window.print()}
            className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold text-sm">
            🖨️ Drukāt
          </button>
        </div>
      </div>

      {/* Print content */}
      <div className="p-6 print:p-4 print:text-black print:bg-white">
        {/* Header */}
        <div className="text-center mb-8 print:mb-4">
          <h1 className="text-3xl font-bold text-amber-400 print:text-black">{compName}</h1>
          <p className="text-gray-400 print:text-gray-600 mt-1">{course.name} · {compDate}</p>
          <p className="text-gray-400 print:text-gray-600 text-sm">
            Dalībnieki: {confirmed.length} · Max punkti: {course.maxScore}
          </p>
        </div>

        {/* Categories */}
        {categories.map(cat => cat.entries.length > 0 && (
          <div key={cat.label} className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-xl font-bold text-amber-400 print:text-black border-b border-amber-500 print:border-black pb-2 mb-3">
              {cat.label}
            </h2>
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 print:text-gray-600 text-sm">
                  <th className="text-left py-1 w-10">Vieta</th>
                  <th className="text-left py-1">Vārds</th>
                  <th className="text-left py-1 hidden sm:table-cell">Klubs</th>
                  <th className="text-left py-1 hidden sm:table-cell">Klase</th>
                  <th className="text-right py-1">Rezultāts</th>
                  <th className="text-right py-1 w-12">X</th>
                </tr>
              </thead>
              <tbody>
                {cat.entries.map(e => (
                  <tr key={e.shooter.id}
                    className={`border-t border-gray-700 print:border-gray-300 ${e.place <= 3 ? 'font-bold' : ''}`}>
                    <td className="py-2">
                      <span className={`inline-block w-7 h-7 rounded-full text-center leading-7 text-sm font-bold
                        ${e.place === 1 ? 'bg-amber-400 text-black' :
                          e.place === 2 ? 'bg-gray-400 text-black' :
                          e.place === 3 ? 'bg-amber-700 text-white' : 'text-gray-400 print:text-gray-600'}`}>
                        {e.place}
                      </span>
                    </td>
                    <td className="py-2">{e.shooter.name}</td>
                    <td className="py-2 hidden sm:table-cell text-gray-400 print:text-gray-600 text-sm">{e.shooter.club}</td>
                    <td className="py-2 hidden sm:table-cell text-gray-400 print:text-gray-600 text-sm">
                      {CLASSIFICATION_LABELS[e.shooter.classification]}
                    </td>
                    <td className="py-2 text-right font-mono font-bold text-amber-400 print:text-black">{e.totalScore}</td>
                    <td className="py-2 text-right font-mono text-gray-300 print:text-gray-600">{e.totalX}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Teams */}
        {teamResults.length > 0 && (
          <div className="mb-8 print:break-inside-avoid">
            <h2 className="text-xl font-bold text-amber-400 print:text-black border-b border-amber-500 print:border-black pb-2 mb-3">
              Komandas
            </h2>
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 print:text-gray-600 text-sm">
                  <th className="text-left py-1 w-10">Vieta</th>
                  <th className="text-left py-1">Komanda</th>
                  <th className="text-left py-1">Dalībnieki</th>
                  <th className="text-right py-1">Kopā</th>
                  <th className="text-right py-1 w-12">X</th>
                </tr>
              </thead>
              <tbody>
                {teamResults.map(t => (
                  <tr key={t.teamName} className="border-t border-gray-700 print:border-gray-300">
                    <td className="py-2">
                      <span className={`inline-block w-7 h-7 rounded-full text-center leading-7 text-sm font-bold
                        ${t.place === 1 ? 'bg-amber-400 text-black' :
                          t.place === 2 ? 'bg-gray-400 text-black' :
                          t.place === 3 ? 'bg-amber-700 text-white' : 'text-gray-400'}`}>
                        {t.place}
                      </span>
                    </td>
                    <td className="py-2 font-bold">🏅 {t.teamName}</td>
                    <td className="py-2 text-gray-400 print:text-gray-600 text-sm">{t.members.join(', ')}</td>
                    <td className="py-2 text-right font-mono font-bold text-amber-400 print:text-black">{t.totalScore}</td>
                    <td className="py-2 text-right font-mono text-gray-300 print:text-gray-600">{t.totalX}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 print:text-gray-400 text-sm mt-8 print:mt-4">
          <p>WA1500 Shooting Assistant · {new Date().toLocaleDateString('lv-LV')}</p>
        </div>
      </div>
    </div>
  )
}