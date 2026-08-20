import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { Card, Button, Input, Textarea } from '../components/ui'

export default function SessionStart() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { coords, status, errorMsg, capture } = useGeolocation()

  const [profiles, setProfiles] = useState([])
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [locationLabel, setLocationLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    capture()
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('active', true)
      .then(({ data }) => setProfiles(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleParticipant(id) {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleStart() {
    setBusy(true)
    setError(null)
    try {
      const { data: newSession, error: sessionError } = await supabase
        .from('service_sessions')
        .insert({
          created_by: user.id,
          status: 'aberta',
          start_lat: coords?.lat ?? null,
          start_lng: coords?.lng ?? null,
          start_location_label: locationLabel || null,
          notes: notes || null,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      const participantsToInsert = [
        { session_id: newSession.id, profile_id: user.id, role_in_session: 'responsável' },
        ...selectedParticipants
          .filter((id) => id !== user.id)
          .map((id) => ({ session_id: newSession.id, profile_id: id, role_in_session: null })),
      ]

      const { error: participantsError } = await supabase
        .from('session_participants')
        .insert(participantsToInsert)

      if (participantsError) throw participantsError

      navigate(`/sessoes/${newSession.id}`)
    } catch (err) {
      setError('Não foi possível iniciar o serviço. Tenta novamente.')
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="font-display text-xl font-semibold text-ink">Iniciar Serviço</h1>

      <Card>
        <p className="text-xs text-muted mb-2">Localização GPS</p>
        {status === 'loading' && <p className="mono text-sm text-cyan">A obter localização...</p>}
        {status === 'ok' && coords && (
          <p className="mono text-sm text-cyan">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            <span className="text-muted"> · ±{Math.round(coords.accuracy)}m</span>
          </p>
        )}
        {status === 'error' && (
          <div>
            <p className="text-alert text-sm">{errorMsg}</p>
            <Button variant="secondary" className="mt-2" onClick={capture}>
              Tentar novamente
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <Input
          label="Nome do local (opcional)"
          placeholder="ex: Base Norte, Talhão 4"
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
        />

        <div>
          <p className="text-xs text-muted mb-2">Utilizadores/pilotos presentes</p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {profiles.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel2 border border-border cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={p.id === user.id || selectedParticipants.includes(p.id)}
                  disabled={p.id === user.id}
                  onChange={() => toggleParticipant(p.id)}
                  className="accent-amber"
                />
                <span className="text-ink">{p.full_name}</span>
                <span className="mono text-xs text-muted ml-auto">{p.role}</span>
              </label>
            ))}
          </div>
        </div>

        <Textarea
          label="Notas (opcional)"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Card>

      {error && <p className="text-alert text-sm mono">{error}</p>}

      <Button onClick={handleStart} disabled={busy} className="w-full">
        {busy ? 'A iniciar...' : 'Confirmar início de serviço'}
      </Button>
    </div>
  )
}
