import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/db/supabase'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Plus } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'

interface Plan {
  id: string
  name: string
  pricing_type: 'per_transaction' | 'per_service' | 'quota'
  price_per_unit: number | null
  quota_limit: number | null
  monthly_price: number | null
  is_active: boolean
  created_at?: string
}

interface PlanWithShopCount extends Plan {
  shop_count?: number
}

export const AdminPlans = () => {
  const { t } = useTranslation()

  // State management
  const [plans, setPlans] = useState<PlanWithShopCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanWithShopCount | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [selectedPlanToDelete, setSelectedPlanToDelete] = useState<PlanWithShopCount | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    pricing_type: 'per_transaction' as 'per_transaction' | 'per_service' | 'quota',
    price_per_unit: '',
    quota_limit: '',
    monthly_price: '',
  })

  // Fetch plans with shop count
  useEffect(() => {
    fetchPlansWithCounts()
  }, [])

  const fetchPlansWithCounts = async () => {
    try {
      setLoading(true)

      // Fetch all plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: true })

      if (plansError) throw plansError

      // Get shop counts for each plan
      if (plansData && plansData.length > 0) {
        const plansWithCounts = await Promise.all(
          plansData.map(async plan => {
            const { count, error } = await supabase
              .from('shops')
              .select('id', { count: 'exact', head: true })
              .eq('plan_id', plan.id)

            return {
              ...plan,
              shop_count: error ? 0 : count || 0,
            }
          })
        )

        setPlans(plansWithCounts)
      } else {
        setPlans([])
      }
    } catch (error: any) {
      console.error('Error fetching plans:', error)
      toast.error(t('admin.plans.error_fetch'))
    } finally {
      setLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      pricing_type: 'per_transaction',
      price_per_unit: '',
      quota_limit: '',
      monthly_price: '',
    })
    setEditingPlan(null)
  }

  // Create/Update plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error(t('errors.required_field'))
      return
    }

    if (formData.pricing_type !== 'quota' && !formData.price_per_unit) {
      toast.error(t('errors.required_field'))
      return
    }

    if (formData.pricing_type === 'quota' && (!formData.quota_limit || !formData.monthly_price)) {
      toast.error(t('errors.required_field'))
      return
    }

    try {
      setSavingPlan(true)

      const planData = {
        name: formData.name,
        pricing_type: formData.pricing_type,
        price_per_unit:
          formData.pricing_type !== 'quota'
            ? parseFloat(formData.price_per_unit) || null
            : null,
        quota_limit:
          formData.pricing_type === 'quota'
            ? parseInt(formData.quota_limit) || null
            : null,
        monthly_price:
          formData.pricing_type === 'quota'
            ? parseFloat(formData.monthly_price) || null
            : null,
      }

      if (editingPlan) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id)

        if (error) throw error
        toast.success(t('admin.plans.plan_updated'))
      } else {
        const { error } = await supabase.from('plans').insert(planData)

        if (error) throw error
        toast.success(t('admin.plans.plan_created'))
      }

      setShowCreateModal(false)
      resetForm()
      await fetchPlansWithCounts()
    } catch (error: any) {
      console.error('Error saving plan:', error)
      toast.error(editingPlan ? t('admin.plans.error_update') : t('admin.plans.error_create'))
    } finally {
      setSavingPlan(false)
    }
  }

  // Delete plan
  const handleDeletePlan = async () => {
    if (!selectedPlanToDelete) return

    try {
      const { error } = await supabase.from('plans').delete().eq('id', selectedPlanToDelete.id)

      if (error) throw error

      toast.success(t('admin.plans.plan_deleted'))
      setShowDeleteConfirm(false)
      setSelectedPlanToDelete(null)
      await fetchPlansWithCounts()
    } catch (error: any) {
      console.error('Error deleting plan:', error)
      toast.error(t('admin.plans.error_delete'))
    }
  }

  // Edit plan
  const handleEditPlan = (plan: PlanWithShopCount) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      pricing_type: plan.pricing_type,
      price_per_unit: plan.price_per_unit?.toString() || '',
      quota_limit: plan.quota_limit?.toString() || '',
      monthly_price: plan.monthly_price?.toString() || '',
    })
    setShowCreateModal(true)
  }

  // Delete with confirmation
  const handleDeleteClick = (plan: PlanWithShopCount) => {
    setSelectedPlanToDelete(plan)
    setShowDeleteConfirm(true)
  }

  // Format pricing display
  const getPricingDisplay = (plan: PlanWithShopCount) => {
    if (plan.pricing_type === 'quota') {
      return (
        <>
          <p className='text-xs text-slate-400'>{t('admin.plans.monthly_price')}</p>
          <p className='text-2xl font-bold text-gold-400'>{formatCurrency(plan.monthly_price || 0)}</p>
          <p className='text-xs text-slate-400 mt-2'>{t('admin.plans.quota_limit')}</p>
          <p className='text-white font-semibold'>{plan.quota_limit} {t('common.all')}/month</p>
        </>
      )
    } else {
      return (
        <>
          <p className='text-xs text-slate-400'>
            {plan.pricing_type === 'per_transaction'
              ? t('admin.plans.per_transaction')
              : t('admin.plans.per_service')}
          </p>
          <p className='text-2xl font-bold text-gold-400'>{formatCurrency(plan.price_per_unit || 0)}</p>
        </>
      )
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-96'>
        <div className='animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-gold-400'></div>
      </div>
    )
  }

  return (
    <div className='space-y-6 pb-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-white mb-2'>{t('admin.plans.title')}</h1>
          <p className='text-slate-400'>{t('admin.plans.description')}</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className='px-6 py-3 bg-gradient-to-r from-gold-400 to-gold-500 text-slate-900 font-semibold rounded-lg hover:shadow-lg hover:shadow-gold-400/30 transition flex items-center gap-2'
        >
          <Plus size={20} />
          {t('admin.plans.create_new_plan')}
        </button>
      </div>

      {/* Plans Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {plans.length === 0 ? (
          <div className='col-span-full text-center py-12'>
            <p className='text-slate-400'>{t('admin.plans.no_plans')}</p>
          </div>
        ) : (
          plans.map(plan => (
            <div
              key={plan.id}
              className='glass rounded-xl border border-white/10 p-6 hover:border-gold-400/30 transition hover:shadow-lg hover:shadow-gold-400/10'
            >
              {/* Plan Header */}
              <div className='flex items-start justify-between mb-4'>
                <div className='flex-1'>
                  <h3 className='text-lg font-bold text-white'>{plan.name}</h3>
                  <p className='text-xs text-slate-400 mt-1 capitalize'>
                    {plan.pricing_type === 'per_transaction'
                      ? t('admin.plans.per_transaction')
                      : plan.pricing_type === 'per_service'
                        ? t('admin.plans.per_service')
                        : t('admin.plans.quota')}
                  </p>
                </div>
                <div className='flex gap-1'>
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className='p-2 hover:bg-white/10 rounded transition text-slate-400 hover:text-gold-400'
                    title={t('admin.plans.edit_plan')}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(plan)}
                    className='p-2 hover:bg-red-500/20 rounded transition text-slate-400 hover:text-red-400'
                    title={t('admin.plans.delete_plan')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Pricing Info */}
              <div className='bg-white/5 border border-white/10 rounded-lg p-4 mb-4'>
                {getPricingDisplay(plan)}
              </div>

              {/* Shop Count Badge */}
              {plan.shop_count !== undefined && plan.shop_count > 0 && (
                <div className='bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-2 text-xs'>
                  <p className='text-blue-300'>
                    {plan.shop_count === 1
                      ? `${plan.shop_count} ${t('common.all')}`
                      : `${plan.shop_count} ${t('common.all')}s`}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* CREATE/EDIT PLAN MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title={
          editingPlan
            ? t('admin.plans.edit_plan')
            : t('admin.plans.create_new_plan')
        }
        size='lg'
      >
        <form onSubmit={handleSavePlan} className='space-y-4'>
          {/* Plan Name */}
          <div>
            <label className='block text-sm font-medium text-slate-200 mb-2'>
              {t('admin.plans.plan_name')} *
            </label>
            <input
              type='text'
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('admin.plans.plan_name')}
              className='w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-gold-400/50 transition'
              required
            />
          </div>

          {/* Pricing Type */}
          <div>
            <label className='block text-sm font-medium text-slate-200 mb-2'>
              {t('admin.plans.pricing_type')} *
            </label>
            <select
              value={formData.pricing_type}
              onChange={e =>
                setFormData({
                  ...formData,
                  pricing_type: e.target.value as 'per_transaction' | 'per_service' | 'quota',
                })
              }
              className='w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition'
            >
              <option value='per_transaction'>{t('admin.plans.per_transaction')}</option>
              <option value='per_service'>{t('admin.plans.per_service')}</option>
              <option value='quota'>{t('admin.plans.quota')}</option>
            </select>
          </div>

          {/* Price Per Unit (for per_transaction / per_service) */}
          {formData.pricing_type !== 'quota' && (
            <div>
              <label className='block text-sm font-medium text-slate-200 mb-2'>
                {t('admin.plans.price_per_unit')} *
              </label>
              <input
                type='number'
                value={formData.price_per_unit}
                onChange={e => setFormData({ ...formData, price_per_unit: e.target.value })}
                placeholder='0.00'
                step='0.01'
                min='0'
                className='w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-gold-400/50 transition'
                required
              />
            </div>
          )}

          {/* Quota Fields (for quota plans) */}
          {formData.pricing_type === 'quota' && (
            <>
              <div>
                <label className='block text-sm font-medium text-slate-200 mb-2'>
                  {t('admin.plans.quota_limit')} *
                </label>
                <input
                  type='number'
                  value={formData.quota_limit}
                  onChange={e => setFormData({ ...formData, quota_limit: e.target.value })}
                  placeholder='100'
                  min='1'
                  className='w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-gold-400/50 transition'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-200 mb-2'>
                  {t('admin.plans.monthly_price')} *
                </label>
                <input
                  type='number'
                  value={formData.monthly_price}
                  onChange={e => setFormData({ ...formData, monthly_price: e.target.value })}
                  placeholder='0.00'
                  step='0.01'
                  min='0'
                  className='w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-gold-400/50 transition'
                  required
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div className='flex gap-3 justify-end pt-4'>
            <button
              type='button'
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
              className='px-4 py-2 border border-white/20 text-slate-300 rounded-lg hover:bg-white/5 transition'
            >
              {t('common.cancel')}
            </button>
            <button
              type='submit'
              disabled={savingPlan}
              className='px-6 py-2 bg-gradient-to-r from-gold-400 to-gold-500 text-slate-900 font-semibold rounded-lg hover:shadow-lg hover:shadow-gold-400/30 transition disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {savingPlan ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setSelectedPlanToDelete(null)
        }}
        onConfirm={handleDeletePlan}
        title={t('admin.plans.delete_plan')}
        message={
          selectedPlanToDelete && selectedPlanToDelete.shop_count && selectedPlanToDelete.shop_count > 0
            ? t('admin.plans.delete_confirm', {
                count: selectedPlanToDelete.shop_count || 0,
              })
            : t('admin.plans.delete_plan')
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDangerous={true}
      />
    </div>
  )
}
