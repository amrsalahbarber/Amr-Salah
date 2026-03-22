import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { usePortalAuth } from '@/hooks/usePortalAuth'

export function PortalDashboard() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, loading, customerName } = usePortalAuth(slug)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(`/shop/${slug}/login`, { replace: true })
    }
  }, [isAuthenticated, loading, slug, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gold-400/20 border-t-gold-400 animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">مرحباً {customerName}</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate(`/shop/${slug}/bookings`)}
            className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-lg p-6 hover:bg-slate-700/40 transition"
          >
            <div className="text-4xl mb-2">📅</div>
            <h3 className="font-bold mb-2">احجز موعد</h3>
            <p className="text-sm text-slate-300">احجز الآن</p>
          </button>

          <button
            onClick={() => navigate(`/shop/${slug}/history`)}
            className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-lg p-6 hover:bg-slate-700/40 transition"
          >
            <div className="text-4xl mb-2">📊</div>
            <h3 className="font-bold mb-2">السجل</h3>
            <p className="text-sm text-slate-300">مواعيدك السابقة</p>
          </button>

          <button
            onClick={() => navigate(`/shop/${slug}/profile`)}
            className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-lg p-6 hover:bg-slate-700/40 transition"
          >
            <div className="text-4xl mb-2">👤</div>
            <h3 className="font-bold mb-2">البيانات</h3>
            <p className="text-sm text-slate-300">معلوماتك الشخصية</p>
          </button>
        </div>
      </div>
    </div>
  )
}
