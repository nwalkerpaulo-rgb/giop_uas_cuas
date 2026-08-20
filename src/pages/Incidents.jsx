import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, Badge, Button, EmptyState } from '../components/ui'

export default function Incidents() {
  const { isAdminOrManager } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('incidents')
        .select('*, profiles!incidents_reported_by_fkey(full_name), incident_photos(id, photo_url)')
        .order('occurred_at', { ascending: false })
      setIncidents(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-xl font-semibold text-ink">
          {isAdminOrManager ? 'Ocorrências — equipa' : 'As minhas ocorrências'}
        </h1>
        <Link to="/incidentes/nova">
          <Button>+ Registar ocorrência</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted text-sm">A carregar...</p>
      ) : incidents.length === 0 ? (
        <EmptyState title="Sem ocorrências registadas" hint="Bom sinal." />
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <Card key={inc.id}>
              <div className="flex items-center justify-between">
                <p className="text-ink text-sm font-medium">{inc.description}</p>
                <Badge status={inc.severity}>{inc.severity}</Badge>
              </div>
              <p className="mono text-xs text-muted mt-1">
                {new Date(inc.occurred_at).toLocaleString('pt-PT')}
                {isAdminOrManager && inc.profiles ? ` · ${inc.profiles.full_name}` : ''}
              </p>
              {inc.actions_taken && <p className="text-muted text-xs mt-2">Ações: {inc.actions_taken}</p>}
              {inc.incident_photos?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {inc.incident_photos.map((p) => (
                    <img key={p.id} src={p.photo_url} alt="" className="w-16 h-16 rounded-lg border border-border object-cover" />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
