import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SessionsList from './pages/SessionsList'
import SessionStart from './pages/SessionStart'
import SessionDetail from './pages/SessionDetail'
import Missions from './pages/Missions'
import Maintenance from './pages/Maintenance'
import Incidents from './pages/Incidents'
import IncidentNew from './pages/IncidentNew'
import Drones from './pages/Drones'
import Batteries from './pages/Batteries'
import CounterDrone from './pages/CounterDrone'
import Equipment from './pages/Equipment'
import Users from './pages/Users'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessoes" element={<SessionsList />} />
            <Route path="/sessoes/nova" element={<SessionStart />} />
            <Route path="/sessoes/:id" element={<SessionDetail />} />
            <Route path="/missoes" element={<Missions />} />
            <Route path="/manutencao" element={<Maintenance />} />
            <Route path="/incidentes" element={<Incidents />} />
            <Route path="/incidentes/nova" element={<IncidentNew />} />
            <Route path="/drones" element={<Drones />} />
            <Route path="/baterias" element={<Batteries />} />
            <Route path="/contra-drone" element={<CounterDrone />} />
            <Route path="/equipamento" element={<Equipment />} />
            <Route path="/utilizadores" element={<Users />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
