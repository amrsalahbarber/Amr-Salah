import { useTranslation } from 'react-i18next'

export const ShopBilling = () => {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-8 text-center">
      <h2 className="text-2xl font-bold text-white mb-4">{t('shop.billing.title') || 'Billing'}</h2>
      <p className="text-gray-400">
        This is an individual barber shop app. No subscription management is needed.
      </p>
    </div>
  )
}
