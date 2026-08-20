import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SessionHud from './SessionHud'

const NAV = [
  { to: '/', label: 'Início', icon: '◈', exact: true },
  { to: '/sessoes', label: 'Sessões', icon: '▤' },
  { to: '/missoes', label: 'Missões', icon: '⟡' },
  { to: '/manutencao', label: 'Manutenção', icon: '⚙', },
  { to: '/incidentes', label: 'Ocorrências', icon: '▲' },
  { to: '/drones', label: 'Drones', icon: '✈' },
  { to: '/baterias', label: 'Baterias', icon: '⚡' },
  { to: '/contra-drone', label: 'Contra-Drone', icon: '◎' },
  { to: '/equipamento', label: 'Equipamento', icon: '▣' },
  { to: '/utilizadores', label: 'Utilizadores', icon: '☰' },
]

function roleLabel(role) {
  return { admin: 'Admin', gestor: 'Gestor', piloto: 'Piloto', observador: 'Observador' }[role] || role
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <SessionHud />

      <header className="border-b border-border bg-panel">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          <div className="font-display font-bold text-lg tracking-tight text-ink flex items-center gap-2">
            <img src="/icon-192.png" alt="" className="w-7 h-7 rounded" />
            GIOP <span className="text-muted font-normal text-sm hidden sm:inline">— Gestão UAS CUAS</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `focus-ring px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-amber/10 text-amber'
                      : 'text-muted hover:text-ink hover:bg-panel2'
                  }`
                }
              >
                <span className="mr-1.5 opacity-70">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            {profile && (
              <div className="text-right hidden sm:block">
                <div className="text-sm text-ink leading-tight">{profile.full_name}</div>
                <div className="mono text-xs text-muted leading-tight">{roleLabel(profile.role)}</div>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="focus-ring text-xs px-3 py-1.5 rounded-md border border-border text-muted hover:text-alert hover:border-alert/50 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* nav mobile */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `focus-ring px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
                  isActive ? 'bg-amber/10 text-amber' : 'text-muted'
                }`
              }
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
