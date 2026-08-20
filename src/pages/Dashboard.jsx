import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useActiveSession } from '../hooks/useActiveSession'
import { Card, Button, Badge, EmptyState } from '../components/ui'

export default function Dashboard() {
  const { profile, isAdminOrManager } = useAuth()
  const { activeSession } = useActiveSession()
  const [recentSessions, setRecentSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const sessionsQuery = supabase
        .from('service_sessions')
        .select('id, status, started_at, ended_at, start_location_label, created_by, profiles!service_sessions_created_by_fkey(full_name)')
        .order('started_at', { ascending: false })
        .limit(6)

      const [{ data: sessions }, { count: droneCount }, { count: missionCount }, { count: incidentCount }] =
        await Promise.all([
          sessionsQuery,
          supabase.from('drones').select('*', { count: 'exact', head: true }),
          supabase.from('missions').select('*', { count: 'exact', head: true }),
          supabase.from('incidents').select('*', { count: 'exact', head: true }),
        ])

      setRecentSessions(sessions || [])
      setStats({ drones: droneCount ?? 0, missions: missionCount ?? 0, incidents: incidentCount ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Olá, {profile?.full_name?.split(' ')[0] || 'operador'}
          </h1>
          <p className="text-muted text-sm mt-1">
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {!activeSession ? (
          <Link to="/sessoes/nova">
            <Button>+ Iniciar Serviço</Button>
          </Link>
        ) : (
          <Link to={`/sessoes/${activeSession.id}`}>
            <Button variant="secondary">Ver serviço em curso →</Button>
          </Link>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <p className="mono text-2xl text-amber">{stats.drones}</p>
            <p className="text-muted text-xs mt-1">Drones na frota</p>
          </Card>
          <Card>
            <p className="mono text-2xl text-cyan">{stats.missions}</p>
            <p className="text-muted text-xs mt-1">Missões registadas</p>
          </Card>
          <Card>
            <p className="mono text-2xl text-alert">{stats.incidents}</p>
            <p className="text-muted text-xs mt-1">Ocorrências</p>
          </Card>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-medium text-ink">
            {isAdminOrManager ? 'Serviços recentes (equipa)' : 'Os meus serviços recentes'}
          </h2>
          <Link to="/sessoes" className="text-xs text-cyan hover:underline">
            Ver todos →
          </Link>
        </div>

        {loading ? (
          <p className="text-muted text-sm">A carregar...</p>
        ) : recentSessions.length === 0 ? (
          <EmptyState
            title="Ainda não há serviços registados"
            hint="Inicia o primeiro serviço para começar a acumular dados."
          />
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <Link key={s.id} to={`/sessoes/${s.id}`}>
                <Card className="flex items-center justify-between hover:border-amber/40 transition-colors">
                  <div>
                    <p className="text-ink text-sm font-medium">
                      {s.start_location_label || 'Localização não confirmada'}
                    </p>
                    <p className="mono text-xs text-muted mt-0.5">
                      {new Date(s.started_at).toLocaleString('pt-PT')}
                      {isAdminOrManager && s.profiles ? ` · ${s.profiles.full_name}` : ''}
                    </p>
                  </div>
                  <Badge status={s.status}>{s.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
