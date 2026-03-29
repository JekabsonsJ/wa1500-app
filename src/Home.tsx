import { useState, useEffect } from 'react'
import Competition from './Competition'
import JoinCompetition from './JoinCompetition'
import Training from './Training'
import Statistics from './Statistics'
import History from './History'
import MyRegistration from './MyRegistration'

type Screen = 'home' | 'competition' | 'join_competition' | 'training' | 'statistics' | 'history' | 'my_registration'

interface LocalRegistration {
  competitionId: string
  competitionName: string
  shooterId: string
  registeredAt: string
}

export default function Home({ onBack }: { onBack?: () => void }) {
  const [screen, setScreen] = useState<Screen>('home')
  
  // My registrations from localStorage
  const [myRegistrations, setMyRegistrations] = useState<LocalRegistration[]>([])
  const [loadingRegs, setLoadingRegs] = useState(false)
  
  // For MyRegistration
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null)
  const [selectedCompetitionName, setSelectedCompetitionName] = useState<string>('')
  const [selectedShooterId, setSelectedShooterId] = useState<string>('')

  // Load registrations from localStorage
  useEffect(() => {
    console.log('🔥 HOME USEEFFECT STARTED!')
    setLoadingRegs(true)
    const stored = localStorage.getItem('myRegistrations')
    console.log('📦 localStorage raw:', stored)
    
    if (stored) {
      try {
        const regs = JSON.parse(stored) as LocalRegistration[]
        console.log('✅ Parsed registrations:', regs)
        setMyRegistrations(regs)
      } catch (err) {
        console.error('❌ Error parsing registrations:', err)
      }
    } else {
      console.log('⚠️ No registrations in localStorage')
    }
    setLoadingRegs(false)
    console.log('✅ HOME USEEFFECT COMPLETED!')
  }, [])

  if (screen === 'competition') {
    return <Competition onBack={() => setScreen('home')} />
  }

  if (screen === 'join_competition') {
    return <JoinCompetition onBack={() => setScreen('home')} />
  }

  if (screen === 'training') {
    return <Training onBack={() => setScreen('home')} />
  }

  if (screen === 'statistics') {
    return <Statistics onBack={() => setScreen('home')} />
  }

  if (screen === 'history') {
    return <History onBack={() => setScreen('home')} />
  }

  if (screen === 'my_registration' && selectedCompetitionId && selectedShooterId) {
    return (
      <MyRegistration
        competitionId={selectedCompetitionId}
        competitionName={selectedCompetitionName}
        shooterId={selectedShooterId}
        onBack={() => setScreen('home')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-amber-400 mb-2 text-center">🎯 Šāvējs</h1>
        <p className="text-gray-400 text-center mb-8">Treniņi un sacensības</p>

        {/* MY REGISTRATIONS SECTION */}
        {myRegistrations.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 mb-6">
            <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
              📋 Manas Pieteikšanās
              {loadingRegs && <span className="text-xs text-gray-500">(Ielādē...)</span>}
            </h3>
            
            <div className="space-y-2">
              {myRegistrations.map((reg, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedCompetitionId(reg.competitionId)
                    setSelectedCompetitionName(reg.competitionName)
                    setSelectedShooterId(reg.shooterId)
                    setScreen('my_registration')
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{reg.competitionName}</p>
                      <p className="text-xs opacity-75">
                        📅 Reģistrēts: {new Date(reg.registeredAt).toLocaleDateString('lv-LV')}
                      </p>
                    </div>
                    <span className="text-amber-400 text-2xl">→</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (confirm('Dzēst visas saglabātās reģistrācijas no šīs ierīces?')) {
                  localStorage.removeItem('myRegistrations')
                  setMyRegistrations([])
                }
              }}
              className="w-full mt-3 bg-red-900 hover:bg-red-800 text-red-300 py-2 rounded-lg text-sm">
              🗑️ Notīrīt saglabātās reģistrācijas
            </button>
          </div>
        )}

        {/* Empty state for no registrations */}
        {!loadingRegs && myRegistrations.length === 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6 text-center">
            <p className="text-gray-400 mb-2">📋 Nav saglabātu pieteikšanos</p>
            <p className="text-gray-500 text-sm">
              Pieslēdzieties sacensībai, un jūsu pieteikšanās tiks saglabāta šeit.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => setScreen('training')}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black py-5 rounded-xl text-xl font-bold flex items-center justify-center gap-3 transition-colors">
            🎯 Treniņi
          </button>

          <button
            onClick={() => setScreen('join_competition')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-xl text-xl font-bold flex items-center justify-center gap-3 transition-colors">
            🏆 Pieslēgties sacensībai
          </button>

          <button
            onClick={() => setScreen('history')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-5 rounded-xl text-xl font-bold flex items-center justify-center gap-3 transition-colors">
            📜 Vēsture
          </button>

          <button
            onClick={() => setScreen('statistics')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-xl text-xl font-bold flex items-center justify-center gap-3 transition-colors">
            📊 Statistika
          </button>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-gray-400 py-3 rounded-xl text-sm">
            ← Mainīt lomu
          </button>
        )}
      </div>
    </div>
  )
}