import { useState, useEffect } from 'react'
import { 
  acknowledgeChanges,
  subscribeToRegistration,
  subscribeToChanges
} from './registrationService'
import type { ShooterRegistration, CompetitionChange } from './types/registration'
import { REGISTRATION_STATUS_LABELS, formatChangeMessage } from './types/registration'

interface Props {
  competitionId: string
  competitionName: string
  shooterId: string
  onBack: () => void
}

export default function MyRegistration({ competitionId, competitionName, shooterId, onBack }: Props) {
  const [registration, setRegistration] = useState<ShooterRegistration | null>(null)
  const [changes, setChanges] = useState<CompetitionChange[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Real-time registration listener
    const unsubReg = subscribeToRegistration(shooterId, competitionId, (reg) => {
      setRegistration(reg)
      setLoading(false)
    })

    // Real-time changes listener
    const unsubChanges = subscribeToChanges(shooterId, competitionId, (chngs) => {
      setChanges(chngs)
    })

    return () => {
      unsubReg()
      unsubChanges()
    }
  }, [shooterId, competitionId])

  async function handleAcknowledge() {
    if (changes.length === 0) return

    await acknowledgeChanges(
      shooterId,
      competitionId,
      changes.map(c => c.id)
    )
    
    setChanges([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Ielādē pieteikšanos...</p>
        </div>
      </div>
    )
  }

  if (!registration) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <button onClick={onBack} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-xl mb-4">❌ Nav pieteikšanās</p>
          <p className="text-gray-500">Jūs neesat pieteicies šīm sacensībām.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <button onClick={onBack} className="text-amber-400 mb-6 text-lg">← Atpakaļ</button>

      <h2 className="text-2xl font-bold text-amber-400 mb-2">Mana Pieteikšanās</h2>
      <p className="text-gray-400 mb-6">{competitionName}</p>

      {changes.length > 0 && (
        <div className="bg-red-900 border-2 border-red-600 rounded-xl p-6 mb-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-red-200 text-xl font-bold mb-1">⚠️ SACENSĪBU INFO ATJAUNINĀTA!</p>
              <p className="text-red-300 text-sm">Organizators ir veicis izmaiņas</p>
            </div>
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              {changes.length} {changes.length === 1 ? 'izmaiņa' : 'izmaiņas'}
            </span>
          </div>

          <div className="bg-red-950 rounded-lg p-4 mb-4 space-y-4">
            {changes.map(change => {
              const formatted = formatChangeMessage(change)
              return (
                <div key={change.id} className="border-b border-red-800 last:border-0 pb-3 last:pb-0">
                  <p className="text-red-200 font-bold mb-2">{formatted.label}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-red-400 text-xs mb-1">Bija:</p>
                      <p className="text-white font-mono">{formatted.before}</p>
                    </div>
                    <div>
                      <p className="text-green-400 text-xs mb-1">Tagad:</p>
                      <p className="text-white font-mono font-bold">{formatted.after}</p>
                    </div>
                  </div>
                  <p className="text-red-400 text-xs mt-2">
                    📅 {new Date(change.timestamp).toLocaleString('lv-LV')}
                  </p>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleAcknowledge}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold">
            ✅ Esmu informēts
          </button>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Reģistrācijas detaļas</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            registration.status === 'confirmed' ? 'bg-green-600 text-white' :
            registration.status === 'pending' ? 'bg-yellow-600 text-black' :
            registration.status === 'checked_in' ? 'bg-blue-600 text-white' :
            'bg-red-600 text-white'
          }`}>
            {REGISTRATION_STATUS_LABELS[registration.status]}
          </span>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">📋 Disciplīna</p>
            <p className="text-white text-lg font-bold">{registration.disciplineName}</p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">👥 Maiņa</p>
            <p className="text-white text-lg font-bold">{registration.relayName}</p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">🕐 Laiks</p>
            <p className="text-amber-400 text-2xl font-bold font-mono">{registration.relayTime}</p>
          </div>

          <div className="border-t border-gray-600 pt-4">
            <p className="text-gray-500 text-xs">
              Reģistrēts: {new Date(registration.registeredAt).toLocaleString('lv-LV')}
            </p>
            {registration.updatedAt !== registration.registeredAt && (
              <p className="text-gray-500 text-xs">
                Atjaunināts: {new Date(registration.updatedAt).toLocaleString('lv-LV')}
              </p>
            )}
          </div>
        </div>
      </div>

      {registration.status === 'confirmed' && changes.length === 0 && (
        <div className="bg-green-900 rounded-xl p-4 text-center">
          <p className="text-green-200 font-bold">✅ Viss kārtībā!</p>
          <p className="text-green-300 text-sm mt-1">Jūsu dalība ir apstiprināta</p>
        </div>
      )}
    </div>
  )
}