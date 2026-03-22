import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface PortalSettings {
  id: string
  shop_id: string
  is_active: boolean
  template_id: number
  primary_color: string
  secondary_color: string
  accent_color: string
  text_color: string
  logo_url: string | null
  banner_url: string | null
  welcome_message: string | null
  portal_slug: string
  created_at: string
  updated_at: string
}

export const usePortalSettings = () => {
  const { shopId } = useAuth()
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPortalSettings = useCallback(async () => {
    try {
      setLoading(true)
      if (!shopId) {
        setPortalSettings(null)
        return
      }

      const { data, error } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('shop_id', shopId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No row found - create default portal settings
          await createDefaultPortalSettings()
          return
        }
        throw error
      }

      setPortalSettings(data as PortalSettings)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching portal settings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [shopId])

  const createDefaultPortalSettings = async () => {
    if (!shopId) return

    try {
      // Generate slug from shop ID
      const slug = `shop-${shopId.substring(0, 8)}`

      const { data, error } = await supabase
        .from('portal_settings')
        .insert({
          shop_id: shopId,
          is_active: false,
          template_id: 1,
          primary_color: '#FFD700',
          secondary_color: '#1E1E2E',
          accent_color: '#FF6B6B',
          text_color: '#FFFFFF',
          portal_slug: slug,
        })
        .select()
        .single()

      if (error) throw error
      setPortalSettings(data as PortalSettings)
      toast.success('تم إنشاء إعدادات البوابة')
    } catch (err: any) {
      console.error('Error creating default portal settings:', err)
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchPortalSettings()
  }, [fetchPortalSettings])

  const updatePortalSettings = async (updates: Partial<PortalSettings>) => {
    try {
      if (!shopId) {
        throw new Error('معرّف المحل غير متوفر')
      }

      // If portal settings don't exist, create them first
      let settingsToUpdate = portalSettings
      if (!settingsToUpdate) {
        await createDefaultPortalSettings()
        // Fetch the newly created settings
        await fetchPortalSettings()
        
        // Re-fetch to get the newly created settings
        const { data: freshData } = await supabase
          .from('portal_settings')
          .select('*')
          .eq('shop_id', shopId)
          .single()
        
        if (!freshData) {
          throw new Error('فشل إنشاء إعدادات البوابة')
        }
        settingsToUpdate = freshData as PortalSettings
      }

      // Check if slug is being changed and if it's unique
      if (updates.portal_slug && updates.portal_slug !== settingsToUpdate.portal_slug) {
        const { data: existingSlug, error: slugError } = await supabase
          .from('portal_settings')
          .select('id')
          .eq('portal_slug', updates.portal_slug)
          .neq('id', settingsToUpdate.id)
          .maybeSingle()

        if (slugError) throw slugError
        if (existingSlug) {
          throw new Error('هذا المعرّف مستخدم بالفعل')
        }
      }

      const { data, error } = await supabase
        .from('portal_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingsToUpdate.id)
        .select()
        .single()

      if (error) throw error

      setPortalSettings(data as PortalSettings)
      toast.success('تم حفظ إعدادات البوابة')
      return data as PortalSettings
    } catch (err: any) {
      console.error('Error updating portal settings:', err)
      toast.error(err.message)
      throw err
    }
  }

  const togglePortalActive = async () => {
    if (!portalSettings) return
    await updatePortalSettings({ is_active: !portalSettings.is_active })
  }

  const updateTemplate = async (templateId: number) => {
    await updatePortalSettings({ template_id: templateId })
  }

  const updateColors = async (colors: {
    primary_color?: string
    secondary_color?: string
    accent_color?: string
    text_color?: string
  }) => {
    await updatePortalSettings(colors)
  }

  const updateSlug = async (slug: string) => {
    // Validate slug format
    if (!slug.match(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)) {
      throw new Error('المعرّف يجب أن يحتوي على أحرف وأرقام وشرطات فقط')
    }
    await updatePortalSettings({ portal_slug: slug })
  }

  return {
    portalSettings,
    loading,
    error,
    fetchPortalSettings,
    updatePortalSettings,
    togglePortalActive,
    updateTemplate,
    updateColors,
    updateSlug,
  }
}
