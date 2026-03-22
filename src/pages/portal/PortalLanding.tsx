import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/db/supabase'

interface PortalSettings {
  id: string
  is_active: boolean
  template_id: number
  primary_color: string
  secondary_color: string
  accent_color: string
  text_color: string
  logo_url?: string
  portal_slug: string
  welcome_message?: string
  shop_id: string
}

export function PortalLanding() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<PortalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPortalSettings = async () => {
      try {
        if (!slug) {
          setError('محل غير محدد')
          return
        }

        const { data, error: err } = await supabase
          .from('portal_settings')
          .select('*')
          .eq('portal_slug', slug)
          .eq('is_active', true)
          .single()

        if (err || !data) {
          setError('هذا المحل غير موجود أو البوربتال معطل')
          return
        }

        setSettings(data as PortalSettings)
      } catch (err) {
        console.error('Error fetching portal settings:', err)
        setError('حدث خطأ في تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }

    fetchPortalSettings()
  }, [slug])

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

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-gold-400 text-black rounded hover:bg-gold-500 transition"
          >
            العودة للرئيسة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${settings.primary_color}15 0%, ${settings.secondary_color}15 100%)`,
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: settings.text_color }}>
            مرحباً بك
          </h1>
          <p className="text-lg" style={{ color: settings.text_color, opacity: 0.8 }}>
            {settings.welcome_message || 'موقع الحجز الإلكتروني لمحل'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <button
            onClick={() => navigate(`/shop/${slug}/login`)}
            className="p-8 rounded-lg transition transform hover:scale-105"
            style={{
              backgroundColor: settings.primary_color,
              color: '#fff',
            }}
          >
            <h2 className="text-2xl font-bold mb-2">دخول</h2>
            <p>لديك حساب بالفعل؟ سجل دخولك هنا</p>
          </button>

          <button
            onClick={() => navigate(`/shop/${slug}/register`)}
            className="p-8 rounded-lg transition transform hover:scale-105 border-2"
            style={{
              borderColor: settings.secondary_color,
              color: settings.text_color,
            }}
          >
            <h2 className="text-2xl font-bold mb-2">تسجيل جديد</h2>
            <p>اضغط هنا لإنشاء حساب جديد</p>
          </button>
        </div>

        <div className="bg-white/5 backdrop-blur p-8 rounded-lg text-center">
          <h3 className="text-xl font-bold mb-4">المميزات الرئيسية</h3>
          <ul className="space-y-2 text-sm">
            <li>✓ احجز مواعيدك بسهولة</li>
            <li>✓ تابع تاريخ حجوزاتك</li>
            <li>✓ احصل على إشعارات التذكير</li>
            <li>✓ دعم العملاء على مدار الساعة</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
