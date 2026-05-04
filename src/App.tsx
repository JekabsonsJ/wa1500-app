import { useState } from 'react'
import Home from './Home'
import OrganizerDashboard from './OrganizerDashboard'
import ScorerDashboard from './ScorerDashboard'
import QuickScore from './QuickScore'
import NetworkStatus from './components/NetworkStatus'

type Role = 'select' | 'shooter' | 'organizer' | 'scorer' | 'quickscore'

function App() {
  const [role, setRole] = useState<Role>('select')

  if (role === 'organizer') {
    return (
      <>
        <NetworkStatus />
        <OrganizerDashboard onBack={() => setRole('select')} />
      </>
    )
  }
  
  if (role === 'scorer') {
    return (
      <>
        <NetworkStatus />
        <ScorerDashboard onBack={() => setRole('select')} />
      </>
    )
  }

  if (role === 'quickscore') {
    return (
      <>
        <NetworkStatus />
        <QuickScore onBack={() => setRole('select')} />
      </>
    )
  }

  if (role === 'shooter') {
    return (
      <>
        <NetworkStatus />
        <Home onBack={() => setRole('select')} />
      </>
    )
  }

  return (
    <>
      <NetworkStatus />
      <RoleSelect onSelect={setRole} />
    </>
  )
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

      <button onClick={() => onSelect('quickscore')}
        className="w-full max-w-sm bg-blue-600 text-white font-bold py-8 rounded-xl text-xl hover:bg-blue-500 flex flex-col items-center gap-2">
        <span className="text-4xl">⚡</span>
        <span>Ātrais Kalkulators</span>
        <span className="text-sm font-normal opacity-75">Ātra punktu skaitīšana</span>
      </button>
    </div>
  )
}

export default App