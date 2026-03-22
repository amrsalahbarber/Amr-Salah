import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function PortalRegister() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (formData.password !== formData.confirmPassword) {
        toast.error('كلمات المرور غير متطابقة')
        return
      }

      toast.error('قرب ما ننهي تطوير هذه الصفحة')
    } catch (err: any) {
      toast.error(err.message || 'خطأ في التسجيل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8">إنشاء حساب جديد</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
                placeholder="أحمد محمد"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
                placeholder="20101234567"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">تاريخ الميلاد (اختياري)</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">تأكيد كلمة المرور</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-400 hover:bg-gold-500 disabled:opacity-50 text-black font-semibold py-2 rounded transition mt-6"
            >
              {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-300">
              هل لديك حساب بالفعل؟{' '}
              <button
                onClick={() => navigate(`/shop/${slug}/login`)}
                className="text-gold-400 hover:underline"
              >
                دخول
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
