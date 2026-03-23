import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useTheme } from '../hooks/useTheme'
import { GlassCard } from '../components/ui/GlassCard'
import { useSettings } from '../db/hooks/useSettings'
import { usePortalSettings } from '../db/hooks/usePortalSettings'
import { motion } from 'framer-motion'
import { exportToJSON, importFromJSON } from '../utils/exportCSV'
import toast from 'react-hot-toast'
import { Edit2, Save, X, Globe } from 'lucide-react'

export const Settings: React.FC = () => {
  const { t } = useTranslation()
  const { language, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { getSetting, updateSetting } = useSettings()
  const { portalSettings, updatePortalSettings, loading: portalLoading } = usePortalSettings()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPortalEditing, setIsPortalEditing] = useState(false)
  const [isPortalSaving, setIsPortalSaving] = useState(false)
  
  // Local form state - separate from fetched data to prevent re-render clearing
  const [formData, setFormData] = useState({
    barbershopName: '',
    barbershopPhone: '',
  })

  // Portal form state
  const [portalFormData, setPortalFormData] = useState({
    is_active: false,
    template_id: 1,
    primary_color: '#FFD700',
    secondary_color: '#1E1E2E',
    accent_color: '#FF6B6B',
    text_color: '#FFFFFF',
    portal_slug: '',
    welcome_message: '',
  })

  // Load settings once on mount - empty dependency array prevents re-runs
  useEffect(() => {
    const name = getSetting('barbershipName', 'My Barbershop')
    const phone = getSetting('barbershipPhone', '')
    setFormData({
      barbershopName: name,
      barbershopPhone: phone,
    })
  }, []) // Only run once on mount

  // Load portal settings when they're fetched
  useEffect(() => {
    if (portalSettings) {
      setPortalFormData({
        is_active: portalSettings.is_active,
        template_id: portalSettings.template_id,
        primary_color: portalSettings.primary_color,
        secondary_color: portalSettings.secondary_color,
        accent_color: portalSettings.accent_color,
        text_color: portalSettings.text_color,
        portal_slug: portalSettings.portal_slug,
        welcome_message: portalSettings.welcome_message || '',
      })
    }
  }, [portalSettings])

  const handleSaveSettings = async () => {
    if (!formData.barbershopName.trim()) {
      toast.error(t('settings.shop_name_required') || 'اسم المحل مطلوب')
      return
    }

    setIsSaving(true)
    try {
      // Save both name and phone to settings
      await updateSetting('barbershipName', formData.barbershopName)
      await updateSetting('barbershipPhone', formData.barbershopPhone)
      
      toast.success(t('settings.save_success') || 'تم حفظ البيانات بنجاح ✅')
      setIsEditing(false)
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error(err.message || t('settings.save_error') || 'خطأ في حفظ البيانات')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reload form data from settings
    const name = getSetting('barbershipName', 'My Barbershop')
    const phone = getSetting('barbershipPhone', '')
    setFormData({
      barbershopName: name,
      barbershopPhone: phone,
    })
    setIsEditing(false)
  }

  const handlePortalSaveSettings = async () => {
    if (!portalFormData.portal_slug.trim()) {
      toast.error('معرّف البوابة مطلوب')
      return
    }

    if (portalLoading) {
      toast.error('جاري تحميل إعدادات البوابة، يرجى الانتظار')
      return
    }

    setIsPortalSaving(true)
    try {
      await updatePortalSettings({
        is_active: portalFormData.is_active,
        template_id: portalFormData.template_id,
        primary_color: portalFormData.primary_color,
        secondary_color: portalFormData.secondary_color,
        accent_color: portalFormData.accent_color,
        text_color: portalFormData.text_color,
        portal_slug: portalFormData.portal_slug,
        welcome_message: portalFormData.welcome_message,
      })
      setIsPortalEditing(false)
    } catch (err: any) {
      console.error('Error saving portal settings:', err)
    } finally {
      setIsPortalSaving(false)
    }
  }

  const handlePortalCancel = () => {
    if (portalSettings) {
      setPortalFormData({
        is_active: portalSettings.is_active,
        template_id: portalSettings.template_id,
        primary_color: portalSettings.primary_color,
        secondary_color: portalSettings.secondary_color,
        accent_color: portalSettings.accent_color,
        text_color: portalSettings.text_color,
        portal_slug: portalSettings.portal_slug,
        welcome_message: portalSettings.welcome_message || '',
      })
    }
    setIsPortalEditing(false)
  }

  const handleExportData = async () => {
    try {
      const data = {
        settings: getSetting('all'),
        exportDate: new Date().toISOString(),
      }
      exportToJSON(data, 'barbershop-backup')
      toast.success(t('notifications.data_exported'))
    } catch (err) {
      toast.error(t('errors.database_error'))
    }
  }

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      await importFromJSON(file)
      toast.success(t('notifications.data_imported'))
    } catch (err) {
      toast.error(t('errors.database_error'))
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-3xl font-bold text-white">{t('settings.title')}</h1>
      </motion.div>

      {/* Barbershop Profile */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{t('settings.barbershop_profile')}</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-500/30 transition text-sm"
            >
              <Edit2 size={16} />
              تعديل
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">{t('settings.barbershop_name')}</label>
              <input
                type="text"
                value={formData.barbershopName}
                onChange={(e) => setFormData(prev => ({ ...prev, barbershopName: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-gold-400 focus:outline-none"
                placeholder="أدخل اسم المحل"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">رقم الهاتف</label>
              <input
                type="tel"
                value={formData.barbershopPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, barbershopPhone: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-gold-400 focus:outline-none"
                placeholder="أدخل رقم الهاتف (مثل: 01012345678)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gold-400/20 text-gold-400 border border-gold-400/20 rounded-lg font-bold hover:bg-gold-400/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isSaving ? t('common.saving') || 'جاري الحفظ...' : t('common.save') || 'حفظ'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/20 rounded-lg font-bold hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={16} />
                {t('common.cancel') || 'إلغاء'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-gray-800/30 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-400">اسم المحل</p>
              <p className="text-lg font-semibold text-white">{formData.barbershopName || 'لم يتم التحديد'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">رقم الهاتف</p>
              <p className="text-lg font-semibold text-white">{formData.barbershopPhone || 'لم يتم التحديد'}</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Customer Portal Settings */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">إعدادات بوابة العملاء</h2>
          </div>
          {!isPortalEditing && (
            <button
              onClick={() => setIsPortalEditing(true)}
              disabled={portalLoading}
              className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg hover:bg-blue-500/30 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 size={16} />
              {portalLoading ? 'جاري التحميل...' : 'تعديل'}
            </button>
          )}
        </div>

        {portalLoading && !isPortalEditing ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-blue-400/20 border-t-blue-400 animate-spin mx-auto mb-2" />
              <p className="text-gray-400">جاري تحميل إعدادات البوابة...</p>
            </div>
          </div>
        ) : isPortalEditing ? (
          <div className="space-y-4 md:space-y-5 p-3 md:p-4 bg-gray-800/20 rounded-lg">\n            {/* Portal Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <span className="text-gray-300">تفعيل البوابة</span>
              <button
                onClick={() => setPortalFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                  portalFormData.is_active ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                    portalFormData.is_active ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-sm md:text-base text-gray-300 mb-3 font-semibold">اختر قالب البوابة</label>
              <div className="grid grid-cols-5 gap-2 md:gap-3">
                {[1, 2, 3, 4, 5].map((tmpl) => (
                  <button
                    key={tmpl}
                    onClick={() => setPortalFormData(prev => ({ ...prev, template_id: tmpl }))}
                    className={`h-12 md:h-10 py-2 md:py-1 px-1 md:px-3 rounded-lg font-bold text-sm md:text-base transition ${
                      portalFormData.template_id === tmpl
                        ? 'bg-gold-400/30 text-gold-400 border-2 border-gold-400'
                        : 'bg-gray-800 text-gray-400 border border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Preview */}
            <div className="border border-gray-600 rounded-lg p-3 md:p-4 overflow-auto bg-gray-800/20">
              <p className="text-base md:text-lg font-semibold text-gold-400 mb-4">معاينة القالب</p>
              
              {/* Template 1: Modern Minimalist */}
              {portalFormData.template_id === 1 && (
                <div className="min-h-48 bg-white text-gray-900 p-6 rounded-lg" dir="rtl">
                  <div className="text-center">
                    <h1 className="text-4xl font-light mb-2" style={{ color: portalFormData.primary_color }}>
                      محل حلاقة
                    </h1>
                    <p className="text-gray-600 mb-6">{portalFormData.welcome_message || 'احجز موعدك الآن'}</p>
                    <div className="space-y-2">
                      <button className="w-full py-2 rounded text-white" style={{ backgroundColor: portalFormData.primary_color }}>
                        دخول
                      </button>
                      <button className="w-full py-2 rounded border-2" style={{ borderColor: portalFormData.primary_color, color: portalFormData.primary_color }}>
                        إنشاء حساب جديد
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Template 2: Luxury Premium */}
              {portalFormData.template_id === 2 && (
                <div className="min-h-48 text-white p-6 rounded-lg" style={{ backgroundColor: portalFormData.secondary_color }} dir="rtl">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-4" style={{ backgroundColor: portalFormData.primary_color }} />
                    <h1 className="text-4xl font-serif mb-2" style={{ color: portalFormData.primary_color }}>
                      محل حلاقة
                    </h1>
                    <div className="h-0.5 w-8 mx-auto mb-4" style={{ backgroundColor: portalFormData.accent_color }} />
                    <p className="text-gray-300 mb-6">{portalFormData.welcome_message || 'تجربة فاخرة'}</p>
                    <div className="space-y-2">
                      <button className="w-full py-2 rounded font-serif" style={{ backgroundColor: portalFormData.primary_color, color: '#000' }}>
                        دخول
                      </button>
                      <button className="w-full py-2 rounded border-b-2" style={{ borderColor: portalFormData.primary_color, color: portalFormData.primary_color }}>
                        تسجيل جديد
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Template 3: Dark Modern */}
              {portalFormData.template_id === 3 && (
                <div className="min-h-48 bg-slate-900 text-white p-6 rounded-lg" dir="rtl">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold mb-2" style={{ color: portalFormData.primary_color }}>
                      محل حلاقة
                    </h1>
                    <p className="text-slate-400 mb-6">{portalFormData.welcome_message || 'احجز الآن'}</p>
                    <div className="space-y-2">
                      <button className="w-full py-2 rounded font-bold" style={{ backgroundColor: portalFormData.primary_color, color: '#000' }}>
                        تسجيل الدخول
                      </button>
                      <button className="w-full py-2 rounded border border-gray-600" style={{ color: portalFormData.primary_color }}>
                        حساب جديد
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Template 4: Gradient */}
              {portalFormData.template_id === 4 && (
                <div 
                  className="min-h-48 text-white p-6 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${portalFormData.secondary_color} 0%, ${portalFormData.primary_color}20 100%)`
                  }}
                  dir="rtl">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold mb-2" style={{ color: portalFormData.primary_color }}>
                      محل حلاقة
                    </h1>
                    <p className="mb-6 opacity-90">{portalFormData.welcome_message || 'احجز موعدك'}</p>
                    <div className="space-y-2">
                      <button className="w-full py-2 rounded font-bold" style={{ backgroundColor: portalFormData.primary_color, color: portalFormData.secondary_color }}>
                        دخول
                      </button>
                      <button className="w-full py-2 rounded border-2" style={{ borderColor: portalFormData.primary_color, color: portalFormData.primary_color }}>
                        اشترك الآن
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Template 5: Colorful */}
              {portalFormData.template_id === 5 && (
                <div className="min-h-48 p-6 rounded-lg" style={{ backgroundColor: portalFormData.secondary_color }} dir="rtl">
                  <div className="text-center">
                    <div className="flex gap-2 justify-center mb-4">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: portalFormData.primary_color }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: portalFormData.accent_color }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: portalFormData.text_color }} />
                    </div>
                    <h1 className="text-4xl font-bold mb-2" style={{ color: portalFormData.primary_color }}>
                      محل حلاقة
                    </h1>
                    <p style={{ color: portalFormData.text_color }} className="mb-6">
                      {portalFormData.welcome_message || 'نرحب بك'}
                    </p>
                    <div className="space-y-2">
                      <button className="w-full py-2 rounded font-bold" style={{ backgroundColor: portalFormData.primary_color, color: portalFormData.secondary_color }}>
                        دخول
                      </button>
                      <button className="w-full py-2 rounded" style={{ backgroundColor: portalFormData.accent_color, color: portalFormData.secondary_color }}>
                        حساب جديد
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Portal Slug */}
            <div>
              <label className="block text-sm md:text-base text-gray-300 mb-2 font-semibold">معرّف البوابة (slug)</label>
              <div className="space-y-2 md:flex md:gap-2">
                <span className="hidden md:block px-3 py-2 bg-gray-800/50 text-gray-400 rounded-lg text-sm whitespace-nowrap">https://yourapp.com/shop/</span>
                <input
                  type="text"
                  value={portalFormData.portal_slug}
                  onChange={(e) => setPortalFormData(prev => ({ ...prev, portal_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  className="w-full px-3 py-2 md:flex-1 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-gold-400 focus:outline-none text-sm"
                  placeholder="my-barbershop"
                  dir="ltr"
                />
              </div>
              <div className="md:hidden mt-2 text-xs text-gray-500">https://yourapp.com/shop/{portalFormData.portal_slug || 'my-shop'}</div>
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm md:text-base text-gray-300 mb-2 font-semibold">اللون الأساسي</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={portalFormData.primary_color}
                    onChange={(e) => setPortalFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-14 h-12 md:w-12 md:h-10 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={portalFormData.primary_color}
                    onChange={(e) => setPortalFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono focus:border-gold-400 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-base text-gray-300 mb-2 font-semibold">اللون الثانوي</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={portalFormData.secondary_color}
                    onChange={(e) => setPortalFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="w-14 h-12 md:w-12 md:h-10 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={portalFormData.secondary_color}
                    onChange={(e) => setPortalFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono focus:border-gold-400 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-base text-gray-300 mb-2 font-semibold">لون التركيز</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={portalFormData.accent_color}
                    onChange={(e) => setPortalFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="w-14 h-12 md:w-12 md:h-10 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={portalFormData.accent_color}
                    onChange={(e) => setPortalFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono focus:border-gold-400 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-base text-gray-300 mb-2 font-semibold">لون النص</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={portalFormData.text_color}
                    onChange={(e) => setPortalFormData(prev => ({ ...prev, text_color: e.target.value }))}
                    className="w-14 h-12 md:w-12 md:h-10 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={portalFormData.text_color}
                    onChange={(e) => setPortalFormData(prev => ({ ...prev, text_color: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono focus:border-gold-400 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">رسالة الترحيب</label>
              <textarea
                value={portalFormData.welcome_message}
                onChange={(e) => setPortalFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-gold-400 focus:outline-none resize-none"
                placeholder="أدخل رسالة ترحيب للعملاء"
                rows={3}
              />
            </div>

            {/* Save/Cancel Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-600">
              <button
                onClick={handlePortalSaveSettings}
                disabled={isPortalSaving || portalLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gold-400/20 text-gold-400 border border-gold-400/20 rounded-lg font-bold hover:bg-gold-400/30 transition disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-sm"
              >
                <Save size={18} />
                {isPortalSaving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={handlePortalCancel}
                disabled={isPortalSaving || portalLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-red-500/20 text-red-400 border border-red-400/20 rounded-lg font-bold hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-sm"
              >
                <X size={18} />
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-gray-800/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">حالة البوابة</p>
                <p className="text-lg font-semibold text-white">
                  {portalSettings?.is_active ? '✅ مفعّلة' : '❌ معطّلة'}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-lg"
                style={{ backgroundColor: portalSettings?.primary_color || '#FFD700' }}
              />
            </div>
            <div>
              <p className="text-xs text-gray-400">معرّف البوابة</p>
              <p className="text-sm font-mono text-blue-400">https://yourapp.com/shop/{portalSettings?.portal_slug}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">القالب</p>
              <p className="text-lg font-semibold text-white">قالب {portalSettings?.template_id}</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Display Preferences */}
      <GlassCard>
        <h2 className="text-xl font-bold text-white mb-4">{t('settings.display_preferences')}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">{t('settings.language')}</span>
            <button
              onClick={toggleLanguage}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              {language === 'ar' ? '🇪🇬 العربية' : '🇬🇧 English'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-300">{t('settings.theme')}</span>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard>
        <h2 className="text-xl font-bold text-white mb-4">{t('settings.data_management')}</h2>
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            className="w-full px-4 py-2 bg-gold-400/20 text-gold-400 border border-gold-400/20 rounded-lg font-bold hover:bg-gold-400/30 transition"
          >
            📤 {t('settings.export_data')}
          </button>
          <label className="block">
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
            <div className="cursor-pointer px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg font-bold hover:bg-blue-500/30 transition text-center">
              📥 {t('settings.import_data')}
            </div>
          </label>
          <button className="w-full px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg font-bold hover:bg-red-500/30 transition">
            🗑️ {t('settings.reset_data')}
          </button>
        </div>
      </GlassCard>

      {/* About */}
      <GlassCard>
        <div className="text-center space-y-2">
          <p className="text-gray-400">💈 Barber Shop Management System</p>
          <p className="text-xs text-gray-500">v1.0.0 • Made with ❤️ for Egyptian barbershops</p>
          <p className="text-xs text-gray-500">🇪🇬 Powered by Supabase + React + Framer Motion</p>
        </div>
      </GlassCard>
    </div>
  )
}
