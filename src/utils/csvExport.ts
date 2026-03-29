import type { Shooter, ShooterResult } from '../types/competition'

// Gender type
type Gender = 'male' | 'female'

// Classification type
type Classification = 'unclassified' | 'marksman' | 'sharpshooter' | 'expert' | 'master' | 'high_master'

// Labels for CSV export
const GENDER_LABELS: Record<Gender, string> = {
  male: 'Vīrietis',
  female: 'Sieviete'
}

const CLASSIFICATION_LABELS: Record<Classification, string> = {
  unclassified: 'Bez klases',
  marksman: 'Marksman',
  sharpshooter: 'Sharpshooter',
  expert: 'Expert',
  master: 'Master',
  high_master: 'High Master'
}

interface TeamResult {
  place: number
  teamName: string
  totalScore: number
  totalX: number
  members: string[]
}

/**
 * Export individual shooter results to CSV
 */
export function exportResultsToCSV(
  compName: string,
  compDate: string,
  disciplineName: string,
  shooters: Shooter[],
  results: ShooterResult[]
) {
  // Filter confirmed results and sort by score
  const confirmedResults = results.filter(r => r.confirmed)
  const sorted = [...confirmedResults]
    .sort((a, b) => b.totalScore - a.totalScore || b.totalX - a.totalX)
    .map((r, i) => ({
      place: i + 1,
      shooter: shooters.find(s => s.id === r.shooterId)!,
      result: r
    }))
    .filter(e => e.shooter)

  if (sorted.length === 0) {
    alert('Nav apstiprinātu rezultātu eksportēšanai!')
    return
  }

  // Determine max number of stages
  const maxStages = Math.max(...confirmedResults.map(r => r.stages.length))

  // Build CSV header
  const headers = [
    'Vieta',
    'Vārds',
    'Numurs',
    'Klubs',
    'Komanda',
    'Dzimums',
    'Klase',
    'Kopējais Rezultāts',
    'X Skaits'
  ]

  // Add stage columns
  for (let i = 1; i <= maxStages; i++) {
    headers.push(`Posms ${i}`)
    headers.push(`Posms ${i} X`)
  }

  // Build CSV rows
  const rows = sorted.map(entry => {
    const { shooter, result } = entry
    const row = [
      entry.place.toString(),
      escapeCSV(shooter.name),
      escapeCSV(shooter.number || ''),
      escapeCSV(shooter.club || ''),
      escapeCSV(shooter.team || ''),
      GENDER_LABELS[shooter.gender as Gender] || shooter.gender,
      CLASSIFICATION_LABELS[shooter.classification as Classification] || shooter.classification,
      result.totalScore.toString(),
      result.totalX.toString()
    ]

    // Add stage results
    for (let i = 0; i < maxStages; i++) {
      if (i < result.stages.length) {
        const stage = result.stages[i]
        row.push(stage.totalAfterPenalty.toString())
        row.push(stage.xCount.toString())
      } else {
        row.push('')
        row.push('')
      }
    }

    return row
  })

  // Generate CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  // Download file
  const filename = generateFilename(compName, compDate, 'Results')
  downloadBlob(blob, filename)
}

/**
 * Export team results to CSV
 */
export function exportTeamResultsToCSV(
  compName: string,
  compDate: string,
  disciplineName: string,
  teamResults: TeamResult[]
) {
  if (teamResults.length === 0) {
    alert('Nav komandu rezultātu eksportēšanai!')
    return
  }

  // Build CSV header
  const headers = [
    'Vieta',
    'Komanda',
    'Kopējais Rezultāts',
    'X Skaits',
    'Dalībnieki'
  ]

  // Build CSV rows
  const rows = teamResults.map(team => [
    team.place.toString(),
    escapeCSV(team.teamName),
    team.totalScore.toString(),
    team.totalX.toString(),
    escapeCSV(team.members.join(', '))
  ])

  // Generate CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  // Download file
  const filename = generateFilename(compName, compDate, 'Team_Results')
  downloadBlob(blob, filename)
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(field: string): string {
  if (!field) return ''
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  
  return field
}

/**
 * Generate CSV filename with sanitized competition name and date
 */
function generateFilename(compName: string, compDate: string, suffix: string): string {
  // Sanitize competition name (remove special characters)
  const sanitizedName = compName
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50) // Limit length

  // Format date (YYYY-MM-DD or fallback to timestamp)
  const dateStr = compDate || new Date().toISOString().split('T')[0]

  return `${sanitizedName}_${dateStr}_${suffix}.csv`
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}