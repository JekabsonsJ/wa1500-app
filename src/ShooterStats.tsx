import type { StageResult, Course } from './types'
import type { Classification, Gender } from './types/scoring'
import { CLASSIFICATION_LABELS, GENDER_LABELS } from './types/scoring'

interface Shooter {
  id: string
  name: string
  club: string
  classification: Classification
  gender: Gender
  team: string
  number: string
  weaponCategory: string
}

interface ShooterResult {
  shooterId: string
  stages: StageResult[]
  totalScore: number
  totalX: number
  confirmed: boolean
  disputed: boolean
}

interface Props {
  shooter: Shooter
  result: ShooterResult
  course: Course
  allResults?: ShooterResult[]
  allShooters?: Shooter[]
  onBack: () => void
}

const SCORE_LABELS = ['X', '10', '9', '8', '7', '0', 'Miss']
const SCORE_COLORS = [
  'bg-yellow-400',
  'bg-amber-500',
  'bg-amber-600',
  'bg-orange-700',
  'bg-orange-800',
  'bg-gray-600',
  'bg-red-700',
]

export default function ShooterStats({ shooter, result, course, allResults = [], allShooters = [], onBack }: Props) {
  // Total counts across all stages
  const totals = result.stages.reduce((acc, stage) => ({
    x: acc.x + stage.score.x,
    ten: acc.ten + stage.score.ten,
    nine: acc.nine + stage.score.nine,
    eight: acc.eight + stage.score.eight,
    seven: acc.seven + stage.score.seven,
    zero: acc.zero + stage.score.zero,
    miss: acc.miss + stage.score.miss,
  }), { x: 0, ten: 0, nine: 0, eight: 0, seven: 0, zero: 0, miss: 0 })

  const totalShots = totals.x + totals.ten + totals.nine + totals.eight + totals.seven + totals.zero + totals.miss
  const counts = [totals.x, totals.ten, totals.nine, totals.eight, totals.seven, totals.zero, totals.miss]
  const maxCount = Math.max(...counts, 1)

  // Ranking among all confirmed results
  const sortedResults = [...allResults]
    .filter(r => r.confirmed)
    .sort((a, b) => b.totalScore - a.totalScore || b.totalX - a.totalX)
  const rank = sortedResults.findIndex(r => r.shooterId === shooter.id) + 1

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button onClick={onBack} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>

      {/* Shooter header */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{shooter.name}</h2>
            <p className="text-gray-400 text-sm">
              {shooter.club}
              {shooter.classification !== 'unclassified' && ` · ${CLASSIFICATION_LABELS[shooter.classification]}`}
              {` · ${GENDER_LABELS[shooter.gender]}`}
            </p>
          </div>
          {rank > 0 && (
            <div className={`rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold
              ${rank === 1 ? 'bg-amber-400 text-black' : rank === 2 ? 'bg-gray-400 text-black' : rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-white'}`}>
              {rank}.
            </div>
          )}
        </div>
        <div className="mt-3 text-center bg-gray-700 rounded-xl p-3">
          <p className="text-gray-400 text-sm">Kopējais rezultāts</p>
          <p className="text-4xl font-mono font-bold text-amber-400">{result.totalScore}-{result.totalX}X</p>
          <p className="text-gray-400 text-sm">no {course.maxScore}</p>
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <h3 className="text-amber-400 font-bold mb-3">Sadalījums pa stages</h3>
        <div className="space-y-2">
          {result.stages.map(r => (
            <div key={r.stageNumber} className="bg-gray-700 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-bold text-amber-400">Stage {r.stageNumber}</span>
                  <span className="text-gray-400 text-sm ml-2">
                    {course.stages[r.stageNumber - 1].distance}m · {course.stages[r.stageNumber - 1].shots} šāv.
                  </span>
                </div>
                <span className="font-mono font-bold">{r.matchScore}-{r.score.x}X</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['X', '10', '9', '8', '7', '0', 'M'].map((label, i) => {
                  const keys = ['x', 'ten', 'nine', 'eight', 'seven', 'zero', 'miss'] as const
                  const val = r.score[keys[i]]
                  return (
                    <div key={label}>
                      <div className="text-gray-400 mb-1">{label}</div>
                      <div className={`rounded font-bold py-1 ${val > 0 ? SCORE_COLORS[i] + ' text-white' : 'bg-gray-600 text-gray-400'}`}>
                        {val}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total hit distribution */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <h3 className="text-amber-400 font-bold mb-3">Kopējais trāpījumu sadalījums</h3>
        <div className="space-y-2">
          {SCORE_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-8 text-right text-sm font-bold text-gray-400">{label}</div>
              <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full ${SCORE_COLORS[i]} rounded-full flex items-center justify-end pr-2 transition-all`}
                  style={{ width: `${(counts[i] / maxCount) * 100}%` }}>
                </div>
              </div>
              <div className="w-8 text-sm font-mono font-bold">
                {counts[i]}
              </div>
              <div className="w-12 text-xs text-gray-400">
                {totalShots > 0 ? `${Math.round((counts[i] / totalShots) * 100)}%` : '0%'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison with others */}
      {allResults.filter(r => r.confirmed && r.shooterId !== shooter.id).length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <h3 className="text-amber-400 font-bold mb-3">Salīdzinājums</h3>
          <div className="space-y-2">
            {sortedResults.map((r, i) => {
              const s = allShooters.find(sh => sh.id === r.shooterId)
              if (!s) return null
              const isMe = r.shooterId === shooter.id
              return (
                <div key={r.shooterId}
                  className={`rounded-xl p-3 flex items-center gap-3 ${isMe ? 'bg-amber-500 text-black' : 'bg-gray-700 text-white'}`}>
                  <span className="font-bold w-6">{i + 1}.</span>
                  <span className="flex-1 font-bold">{s.name}</span>
                  <span className="font-mono font-bold">{r.totalScore}-{r.totalX}X</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}