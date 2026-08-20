import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, uploadFile, BUCKETS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { Card, Button, Select, Textarea } from '../components/ui'

export default function IncidentNew() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('sessao')
  const { coords, status, capture } = useGeolocation()

  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('baixa')
  const [actionsTaken, setActionsTaken] = useState('')
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { capture() }, [])

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || [])
    setPhotos((prev) => [...prev, ...files])
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setError('Descreve a ocorrência.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { data: incident, error: err } = await supabase
        .from('incidents')
        .insert({
          session_id: sessionId || null,
          reported_by: user.id,
          severity,
          description,
          actions_taken: actionsTaken || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        })
        .select()
        .single()

      if (err) throw err

      for (const file of photos) {
        const path = `${incident.id}/${Date.now()}_${file.name}`
        const url = await uploadFile(BUCKETS.PHOTOS, path, file)
        await supabase.from('incident_photos').insert({ incident_id: incident.id, photo_url: url })
      }

      navigate(sessionId ? `/sessoes/${sessionId}` : '/incidentes')
    } catch (err) {
      console.error(err)
      setError('Não foi possível registar a ocorrência.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="font-display text-xl font-semibold text-ink">Registar Ocorrência</h1>

      <Card>
        <p className="text-xs text-muted mb-2">Localização GPS</p>
        {status === 'loading' && <p className="mono text-sm text-cyan">A obter localização...</p>}
        {status === 'ok' && coords && (
          <p className="mono text-sm text-cyan">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
        )}
        {status === 'error' && <p className="text-alert text-sm">Localização indisponível — pode continuar sem GPS.</p>}
      </Card>

      <Card className="space-y-4">
        <Select label="Gravidade" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </Select>

        <Textarea
          label="Descrição"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que aconteceu?"
          required
        />

        <Textarea
          label="Ações tomadas (opcional)"
          rows={2}
          value={actionsTaken}
          onChange={(e) => setActionsTaken(e.target.value)}
        />

        <div>
          <p className="text-xs text-muted mb-1.5">Fotos (opcional)</p>
          <label className="text-xs text-amber cursor-pointer hover:underline">
            + Adicionar fotos
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoSelect} />
          </label>
          {photos.length > 0 && (
            <p className="text-muted text-xs mt-1">{photos.length} foto(s) selecionada(s)</p>
          )}
        </div>
      </Card>

      {error && <p className="text-alert text-sm mono">{error}</p>}

      <Button onClick={handleSubmit} disabled={busy} className="w-full">
        {busy ? 'A registar...' : 'Registar ocorrência'}
      </Button>
    </div>
  )
}
