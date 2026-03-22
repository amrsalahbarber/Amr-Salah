import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function PortalLogin() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (!slug) {
        toast.error('خطأ: محل غير محدد')
        return
      }

      toast.error('قرب ما ننهي تطوير هذه الصفحة')
    } catch (err: any) {
      toast.error(err.message || 'خطأ في تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/30 backdrop-blur border border-slate-700/50 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8">تسجيل الدخول</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-400"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-400"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-400 hover:bg-gold-500 disabled:opacity-50 text-black font-semibold py-2 rounded transition"
            >
              {loading ? 'جاري التحميل...' : 'دخول'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-300">
              ليس لديك حساب؟{' '}
              <button
                onClick={() => navigate(`/shop/${slug}/register`)}
                className="text-gold-400 hover:underline"
              >
                سجل الآن
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
