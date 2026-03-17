import Statistics from './Statistics'
import History from './History'
import { useState } from 'react'
import Training from './Training'
import Competition from './Competition'
import JoinCompetition from './JoinCompetition'
import OrganizerDashboard from './OrganizerDashboard'
import ScorerDashboard from './ScorerDashboard'

type Role = 'select' | 'shooter' | 'organizer' | 'scorer'
type ShooterScreen = 'dashboard' | 'training' | 'competition' | 'history' | 'statistics'

function App() {
  const [role, setRole] = useState<Role>('select')

  if (role === 'organizer') {
    return <OrganizerDashboard onBack={() => setRole('select')} />
  }
  if (role === 'scorer') {
  return <ScorerDashboard onBack={() => setRole('select')} />
}

  if (role === 'shooter') {
    return <ShooterApp onBack={() => setRole('select')} />
  }

  return <RoleSelect onSelect={setRole} />
}

function RoleSelect({ onSelect }: { onSelect: (r: Role) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6 bg-gray-900">
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold text-amber-400">WA1500</h1>
        <p className="text-gray-400 mt-1">Shooting Assistant</p>
      </div>

      <button onClick={() => onSelect('shooter')}
        className="w-full max-w-sm bg-amber-500 text-black font-bold py-8 rounded-xl text-xl hover:bg-amber-400 flex flex-col items-center gap-2">
        <span className="text-4xl">🎯</span>
        <span>Šāvējs</span>
        <span className="text-sm font-normal opacity-75">Treniņš un sacensības</span>
      </button>

      <button onClick={() => onSelect('organizer')}
        className="w-full max-w-sm bg-gray-700 text-white font-bold py-8 rounded-xl text-xl hover:bg-gray-600 flex flex-col items-center gap-2">
        <span className="text-4xl">🏆</span>
        <span>Organizators</span>
        <span className="text-sm font-normal opacity-75">Izveidot un pārvaldīt sacensības</span>
      </button>

      <button onClick={() => onSelect('scorer')}
        className="w-full max-w-sm bg-gray-700 text-white font-bold py-8 rounded-xl text-xl hover:bg-gray-600 flex flex-col items-center gap-2">
        <span className="text-4xl">📋</span>
        <span>Punktu Skaitītājs</span>
        <span className="text-sm font-normal opacity-75">Ievadīt rezultātus</span>
      </button>
    </div>
  )
}

function ShooterApp({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<ShooterScreen>('dashboard')

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {screen === 'dashboard' && <ShooterDashboard onNavigate={setScreen} onBack={onBack} />}
      {screen === 'training' && <Training onBack={() => setScreen('dashboard')} />}
      {screen === 'competition' && <JoinCompetition onBack={() => setScreen('dashboard')} />}
      {screen === 'history' && <History onBack={() => setScreen('dashboard')} />}
      {screen === 'statistics' && <Statistics onBack={() => setScreen('dashboard')} />}
    </div>
  )
}

function ShooterDashboard({ onNavigate, onBack }: { onNavigate: (s: ShooterScreen) => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-amber-400">🎯 Šāvējs</h1>
      </div>

      <button onClick={() => onNavigate('training')}
        className="w-full max-w-sm bg-amber-500 text-black font-bold py-6 rounded-xl text-xl hover:bg-amber-400">
        🎯 Treniņš
      </button>

      <button onClick={() => onNavigate('competition')}
        className="w-full max-w-sm bg-gray-700 text-white font-bold py-6 rounded-xl text-xl hover:bg-gray-600">
        🏆 Pieslēgties sacensībai
      </button>

      <button onClick={() => onNavigate('history')}
        className="w-full max-w-sm bg-gray-700 text-white font-bold py-6 rounded-xl text-xl hover:bg-gray-600">
        📋 Vēsture
      </button>

      <button onClick={() => onNavigate('statistics')}
        className="w-full max-w-sm bg-gray-700 text-white font-bold py-6 rounded-xl text-xl hover:bg-gray-600">
        📊 Statistika
      </button>

      <button onClick={onBack} className="text-gray-500 mt-4 text-sm">
        ← Mainīt lomu
      </button>
    </div>
  )
}

function Placeholder({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="p-6">
      <button onClick={onBack} className="text-amber-400 mb-4 text-lg">← Atpakaļ</button>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-gray-400 mt-2">Drīzumā...</p>
    </div>
  )
}

export default App