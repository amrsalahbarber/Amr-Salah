import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { usePortalAuth } from '@/hooks/usePortalAuth'

export function PortalProfile() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, loading, customerName, email, phone } = usePortalAuth(slug)

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
        <h1 className="text-3xl font-bold mb-8">بيانات الحساب</h1>

        <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-lg p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">الاسم الكامل</label>
            <p className="text-white">{customerName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">البريد الإلكتروني</label>
            <p className="text-white">{email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">رقم الهاتف</label>
            <p className="text-white">{phone}</p>
          </div>

          <button
            onClick={() => navigate(`/shop/${slug}/dashboard`)}
            className="mt-6 px-6 py-2 bg-gold-400 hover:bg-gold-500 text-black font-semibold rounded transition"
          >
            العودة للرئيسة
          </button>
        </div>
      </div>
    </div>
  )
}
