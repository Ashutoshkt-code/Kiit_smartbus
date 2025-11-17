import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { UserCircle2, Shield, LogOut, MapPin, TrendingUp, ArrowRight, Bus } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

type UserRole = 'STUDENT' | 'DRIVER' | 'ADMIN'

type UserProfile = {
  id: string
  email: string
  name: string
  role: UserRole
  driverBusId?: string
}

type RouteStat = {
  id: string
  route: string
  busId: string
  trips: number
  lastTaken: string
  trend: 'up' | 'down' | 'steady'
}

const studentRouteHistory: RouteStat[] = [
  { id: 'route-1', route: 'Campus 1 → Campus 6', busId: 'KB001', trips: 42, lastTaken: 'Today · 8:05 AM', trend: 'up' },
  { id: 'route-2', route: 'Campus 6 → Campus 15', busId: 'KB003', trips: 28, lastTaken: 'Yesterday · 6:50 PM', trend: 'steady' },
  { id: 'route-3', route: 'Campus 15 → Campus 1', busId: 'KB005', trips: 19, lastTaken: 'Yesterday · 9:10 AM', trend: 'down' },
]

const driverRouteHistory: RouteStat[] = [
  { id: 'driver-route-1', route: 'Campus 25 → Campus 1', busId: 'KB010', trips: 56, lastTaken: 'Today · 7:45 AM', trend: 'up' },
  { id: 'driver-route-2', route: 'Campus 1 → Campus 6', busId: 'KB010', trips: 31, lastTaken: 'Today · 5:10 PM', trend: 'steady' },
  { id: 'driver-route-3', route: 'Campus 6 → Campus 25', busId: 'KB012', trips: 22, lastTaken: '2 days ago · 6:40 PM', trend: 'down' },
]

const roleStyles: Record<UserRole, { label: string; badge: string; glow: string }> = {
  STUDENT: {
    label: 'Student',
    badge: 'bg-green-100 text-green-700 border border-green-200',
    glow: 'from-green-50 via-white to-white',
  },
  DRIVER: {
    label: 'Driver',
    badge: 'bg-blue-100 text-blue-700 border border-blue-200',
    glow: 'from-blue-50 via-white to-white',
  },
  ADMIN: {
    label: 'Administrator',
    badge: 'bg-purple-100 text-purple-700 border border-purple-200',
    glow: 'from-purple-50 via-white to-white',
  },
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMe() {
      try {
        let token = sessionStorage.getItem('accessToken')
        if (!token) {
          const r = await axios.post(`${API}/api/auth/refresh`, {}, { withCredentials: true })
          token = r.data.accessToken
          sessionStorage.setItem('accessToken', token || '')
          sessionStorage.setItem('user', JSON.stringify(r.data.user))
        }
        const res = await axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        setProfile(res.data)
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchMe()
  }, [])

  function logout() {
    axios.post(`${API}/api/auth/logout`, {}, { withCredentials: true }).finally(() => {
      sessionStorage.clear()
      navigate('/login')
    })
  }

  const derivedId = profile?.email?.split('@')[0] || 'N/A'
  const idLabel =
    profile?.role === 'DRIVER'
      ? 'Driver ID'
      : profile?.role === 'ADMIN'
        ? 'Admin ID'
        : 'Student ID'
  const roleStyle = profile ? roleStyles[profile.role] : roleStyles.STUDENT

  const mostTakenRoutes = useMemo<RouteStat[]>(() => {
    if (!profile) return studentRouteHistory
    if (profile.role === 'DRIVER') return driverRouteHistory
    return studentRouteHistory
  }, [profile])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-10 px-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-green-600">Personal Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-900">Profile Overview</h1>
            <p className="text-gray-500">Manage your KIIT SmartBus identity and commute history.</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-lg">
            <p className="text-gray-500">Loading your profile…</p>
          </div>
        ) : profile ? (
          <>
            <div className={`rounded-3xl bg-gradient-to-br ${roleStyle.glow} p-1 shadow-lg`}>
              <div className="rounded-[26px] border border-white/70 bg-white/80 p-8 backdrop-blur">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <UserCircle2 className="h-12 w-12" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Logged in as</p>
                      <h2 className="text-3xl font-semibold text-gray-900">{profile.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium ${roleStyle.badge}`}>
                          <Shield className="h-4 w-4" />
                          {roleStyle.label}
                        </span>
                        <span className="inline-flex rounded-full border border-gray-200 px-4 py-1 text-sm text-gray-600">
                          {profile.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-left">
                      <p className="text-xs uppercase tracking-wide text-gray-500">{idLabel}</p>
                      <p className="text-xl font-semibold text-gray-900">{derivedId}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-left">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Internal ID</p>
                      <p className="text-xl font-semibold text-gray-900 truncate">{profile.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Most Taken Routes</h3>
                    <p className="text-sm text-gray-500">Based on the last 30 days of usage</p>
                  </div>
                  <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Live Insights
                  </div>
                </div>
                <div className="space-y-4">
                  {mostTakenRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 transition hover:border-emerald-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-1 items-start gap-3">
                        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                          <Bus className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{route.route}</p>
                          <p className="text-sm text-gray-500">Bus {route.busId}</p>
                          <p className="text-xs text-gray-400">Last ride · {route.lastTaken}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <TrendingUp
                          className={`h-4 w-4 ${
                            route.trend === 'down' ? 'text-red-500' : route.trend === 'steady' ? 'text-gray-400' : 'text-green-500'
                          }`}
                        />
                        {route.trips} trips
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
                  <h3 className="text-xl font-semibold text-gray-900">Commute Snapshot</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-green-100 bg-green-50/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-green-700">Current Role</p>
                      <p className="text-2xl font-semibold text-green-900">{roleStyle.label}</p>
                      <p className="mt-1 text-sm text-green-700">Assigned to KIIT SmartBus program</p>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-blue-700">Primary Campus</p>
                      <p className="text-2xl font-semibold text-blue-900">Campus 1</p>
                      <p className="mt-1 text-sm text-blue-700">Default boarding point</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
                  <h3 className="text-xl font-semibold text-gray-900">Quick Links</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <button className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 text-left text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50/70">
                      <span className="flex items-center gap-2 font-medium">
                        <MapPin className="h-4 w-4 text-emerald-500" />
                        View Live Tracker
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </button>
                    <button className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 text-left text-gray-700 transition hover:border-blue-200 hover:bg-blue-50/70">
                      <span className="flex items-center gap-2 font-medium">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Seat Availability
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-amber-800 shadow">
            Unable to load profile information.
          </div>
        )}
      </div>
    </div>
  )
}



