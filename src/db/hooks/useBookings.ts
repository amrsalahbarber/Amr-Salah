import { useState, useEffect, useCallback } from 'react'
import { supabase, Booking } from '../supabase'
import { getEgyptDateString } from '../../utils/egyptTime'
import toast from 'react-hot-toast'
import { appEmitter } from '../../utils/eventEmitter'

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Fetching bookings from database...')
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('bookingtime', { ascending: true })

      if (error) throw error
      console.log('Bookings fetched:', data?.length || 0, 'records')

      // Convert lowercase database field names to camelCase
      const normalizedData = (data || []).map((b: any) => ({
        id: b.id,
        clientId: b.clientid,
        clientName: b.clientname,
        clientPhone: b.clientphone,
        barberId: b.barberid,
        barberName: b.barbername,
        serviceType: b.servicetype,
        bookingTime: b.bookingtime,
        duration: b.duration,
        queueNumber: b.queuenumber,
        status: b.status,
        notes: b.notes,
        createdAt: b.createdat,
        updatedAt: b.updatedat,
      }))

      setBookings(normalizedData)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching bookings:', err)
      setError(err.message)
      toast.error('خطأ في جلب الحجوزات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Listen for new bookings
  useEffect(() => {
    const handleNewBooking = () => {
      console.log('New booking detected, refreshing...')
      fetchBookings()
    }
    appEmitter.on('booking:created', handleNewBooking)
    return () => {
      appEmitter.off('booking:created', handleNewBooking)
    }
  }, [fetchBookings])

  /**
   * Smart algorithm to calculate queue number and find next available slot
   * يختار الحلاق الأقل انشغالاً في نفس اليوم
   */
  const calculateSmartQueue = async (
    bookingTime: string,
    selectedBarberId?: string
  ): Promise<{ queueNumber: number; recommendedBarberId?: string }> => {
    // Get all bookings for the same day (pending/ongoing only)
    const bookingDate = new Date(bookingTime).toLocaleDateString('en-CA')
    const dayBookings = bookings.filter((b) => {
      const bDate = new Date(b.bookingTime).toLocaleDateString('en-CA')
      // استبعد المكتملة والملغاة
      return bDate === bookingDate && b.status !== 'cancelled' && b.status !== 'completed'
    })

    // Parse the booking time to get hour and minutes
    const newBookingHour = parseInt(bookingTime.split('T')[1].substring(0, 2))
    const newBookingMin = parseInt(bookingTime.split('T')[1].substring(3, 5))

    // If barber is specified, calculate queue for that barber
    if (selectedBarberId) {
      // Get all bookings for this barber on this day, sorted by time
      const barberBookings = dayBookings
        .filter((b) => b.barberId === selectedBarberId)
        .sort((a, b) => {
          const aTime = parseInt(a.bookingTime.split('T')[1].substring(0, 5).replace(':', ''))
          const bTime = parseInt(b.bookingTime.split('T')[1].substring(0, 5).replace(':', ''))
          return aTime - bTime
        })

      // Count bookings before this time
      const bookingsBefore = barberBookings.filter((b) => {
        const bHour = parseInt(b.bookingTime.split('T')[1].substring(0, 2))
        const bMin = parseInt(b.bookingTime.split('T')[1].substring(3, 5))
        const bTime = bHour * 100 + bMin
        const newTime = newBookingHour * 100 + newBookingMin
        return bTime < newTime
      })

      const nextQueue = bookingsBefore.length + 1
      return { queueNumber: nextQueue, recommendedBarberId: selectedBarberId }
    }

    // Smart distribution: find the barber with least bookings today
    try {
      const { data: barbers } = await supabase
        .from('barbers')
        .select('*')
        .eq('active', true)

      if (!barbers || barbers.length === 0) {
        // Fallback: use next available queue number
        const allQueues = dayBookings.map((b) => b.queueNumber).sort((a, b) => a - b)
        const nextQueue = allQueues.length === 0 ? 1 : Math.max(...allQueues) + 1
        return { queueNumber: nextQueue }
      }

      // Count bookings per barber
      const barberCounts = barbers.map((barber) => ({
        id: barber.id,
        count: dayBookings.filter((b) => b.barberId === barber.id).length,
      }))

      // Select barber with least bookings
      const recommendedBarber = barberCounts.reduce((prev, current) =>
        (current.count < prev.count) ? current : prev
      )

      // Get all bookings for the recommended barber, sorted by time
      const barberBookings = dayBookings
        .filter((b) => b.barberId === recommendedBarber.id)
        .sort((a, b) => {
          const aTime = parseInt(a.bookingTime.split('T')[1].substring(0, 5).replace(':', ''))
          const bTime = parseInt(b.bookingTime.split('T')[1].substring(0, 5).replace(':', ''))
          return aTime - bTime
        })

      // Count bookings before this time
      const bookingsBefore = barberBookings.filter((b) => {
        const bHour = parseInt(b.bookingTime.split('T')[1].substring(0, 2))
        const bMin = parseInt(b.bookingTime.split('T')[1].substring(3, 5))
        const bTime = bHour * 100 + bMin
        const newTime = newBookingHour * 100 + newBookingMin
        return bTime < newTime
      })

      const nextQueue = bookingsBefore.length + 1

      console.log(`Smart queue calculated: Queue #${nextQueue} for barber ${recommendedBarber.id} at ${bookingTime}`)
      return { queueNumber: nextQueue, recommendedBarberId: recommendedBarber.id }
    } catch (err) {
      console.error('Error in smart queue calculation:', err)
      const allQueues = dayBookings.map((b) => b.queueNumber).sort((a, b) => a - b)
      const nextQueue = allQueues.length === 0 ? 1 : Math.max(...allQueues) + 1
      return { queueNumber: nextQueue }
    }
  }

  /**
   * Calculate remaining time and position in queue
   */
  const getQueueInfo = (queueNumber: number, bookingTime: string) => {
    const bookingDate = new Date(bookingTime).toLocaleDateString('en-CA')
    const dayBookings = bookings
      .filter((b) => {
        const bDate = new Date(b.bookingTime).toLocaleDateString('en-CA')
        return (
          bDate === bookingDate &&
          b.status !== 'cancelled' &&
          b.status !== 'completed' &&
          b.queueNumber < queueNumber
        )
      })
      .sort((a, b) => a.queueNumber - b.queueNumber)

    const totalMinutesBefore = dayBookings.reduce((sum, b) => sum + (b.duration || 30), 0)
    const remainingQueue = dayBookings.length
    const estimatedWaitTime = totalMinutesBefore + (remainingQueue * 5) // +5 min buffer per person

    return {
      positionInQueue: queueNumber,
      peopleAhead: remainingQueue,
      estimatedWaitMinutes: estimatedWaitTime,
      estimatedStartTime: new Date(
        new Date(bookingTime).getTime() + estimatedWaitTime * 60000
      ).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  }

  /**
   * Check if time slot is available
   */
  const isTimeSlotAvailable = (bookingTime: string, barberId?: string): boolean => {
    const timeWindow = 15 * 60000 // 15 minute window

    const conflictingBooking = bookings.find((b) => {
      // استبعد الحجوزات المكتملة والملغاة
      if (b.status === 'cancelled' || b.status === 'completed') return false

      const bookingTimeMs = new Date(b.bookingTime).getTime()
      const requestTimeMs = new Date(bookingTime).getTime()
      const timeDiff = Math.abs(bookingTimeMs - requestTimeMs)

      if (barberId && b.barberId) {
        return b.barberId === barberId && timeDiff < timeWindow
      }

      return timeDiff < timeWindow
    })

    return !conflictingBooking
  }

  const addBooking = async (
    booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'queueNumber'>
  ) => {
    try {
      // Validate bookingTime exists
      if (!booking.bookingTime || booking.bookingTime.trim() === '') {
        throw new Error('bookingTime is required and cannot be empty')
      }

      // Check if time slot is available
      if (!isTimeSlotAvailable(booking.bookingTime, booking.barberId)) {
        const errorMsg = 'هذا الموعد محجوز بالفعل. اختر موعد آخر'
        toast.error(errorMsg)
        throw new Error(errorMsg)
      }

      // Calculate smart queue number
      const { queueNumber, recommendedBarberId } = await calculateSmartQueue(
        booking.bookingTime,
        booking.barberId
      )

      console.log('Adding booking with:', {
        clientId: booking.clientId,
        bookingTime: booking.bookingTime,
        barberId: booking.barberId || recommendedBarberId,
      })

      const newBooking = {
        clientid: booking.clientId,
        clientname: booking.clientName,
        clientphone: booking.clientPhone,
        barberid: booking.barberId || recommendedBarberId,
        barbername: booking.barberName,
        servicetype: booking.serviceType,
        bookingtime: booking.bookingTime,
        duration: booking.duration,
        queuenumber: queueNumber,
        status: 'pending',
        notes: booking.notes,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert(newBooking as any)
        .select()

      if (error) throw error

      await fetchBookings()
      appEmitter.emit('booking:created', data?.[0])
      toast.success('تم إنشاء الحجز بنجاح ✓')
      return data?.[0]
    } catch (err: any) {
      console.error('Error adding booking:', err)
      setError(err.message)
      if (!err.message.includes('محجوز')) {
        toast.error(err.message || 'خطأ في إنشاء الحجز')
      }
      throw err
    }
  }

  const updateBooking = async (
    id: string,
    updates: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    try {
      // Convert camelCase to lowercase for PostgreSQL
      const dbUpdates: any = {}
      Object.entries(updates).forEach(([key, value]) => {
        dbUpdates[key.toLowerCase()] = value
      })
      dbUpdates['updatedat'] = new Date().toISOString()

      const { data, error } = await supabase
        .from('bookings')
        .update(dbUpdates)
        .eq('id', id)
        .select()

      if (error) throw error
      await fetchBookings()
      toast.success('تم تحديث الحجز بنجاح')
      return data?.[0]
    } catch (err: any) {
      console.error('Error updating booking:', err)
      setError(err.message)
      toast.error(err.message || 'خطأ في تحديث الحجز')
      throw err
    }
  }

  const deleteBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchBookings()
      toast.success('تم حذف الحجز بنجاح')
    } catch (err: any) {
      console.error('Error deleting booking:', err)
      setError(err.message)
      toast.error(err.message || 'خطأ في حذف الحجز')
      throw err
    }
  }

  /**
   * Get today's bookings with queue info
   */
  const getTodayBookings = () => {
    const today = getEgyptDateString()
    return bookings
      .filter((b) => {
        const bDate = new Date(b.bookingTime).toLocaleDateString('en-CA')
        return bDate === today && b.status !== 'cancelled'
      })
      .sort((a, b) => a.queueNumber - b.queueNumber)
      .map((b) => ({
        ...b,
        queueInfo: getQueueInfo(b.queueNumber, b.bookingTime),
      }))
  }

  /**
   * Get upcoming bookings (next 24-48 hours)
   */
  const getUpcomingBookings = () => {
    const now = new Date()
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    return bookings
      .filter((b) => {
        const bookingDate = new Date(b.bookingTime)
        return (
          bookingDate >= now &&
          bookingDate <= in48Hours &&
          b.status !== 'cancelled'
        )
      })
      .sort((a, b) => new Date(a.bookingTime).getTime() - new Date(b.bookingTime).getTime())
  }

  /**
   * Get bookings by client
   */
  const getClientBookings = (clientId: string) => {
    return bookings
      .filter((b) => b.clientId === clientId && b.status !== 'cancelled')
      .sort((a, b) => new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime())
  }

  /**
   * Get barber's schedule for the day
   */
  const getBarberSchedule = (barberId: string, date?: string) => {
    const targetDate = date || getEgyptDateString()
    return bookings
      .filter((b) => {
        const bDate = new Date(b.bookingTime).toLocaleDateString('en-CA')
        return b.barberId === barberId && bDate === targetDate && b.status !== 'cancelled'
      })
      .sort((a, b) => a.queueNumber - b.queueNumber)
  }

  return {
    bookings,
    loading,
    error,
    fetchBookings,
    addBooking,
    updateBooking,
    deleteBooking,
    getTodayBookings,
    getUpcomingBookings,
    getClientBookings,
    getBarberSchedule,
    calculateSmartQueue,
    isTimeSlotAvailable,
    getQueueInfo,
  }
}
