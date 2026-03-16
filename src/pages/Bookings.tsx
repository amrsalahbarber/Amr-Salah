import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBookings } from '../db/hooks/useBookings'
import { useClients } from '../db/hooks/useClients'
import { useBarbers } from '../db/hooks/useBarbers'
import { Booking } from '../db/supabase'
import { getEgyptDateString } from '../utils/egyptTime'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Plus,
  X,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface NewBooking {
  searchQuery: string
  clientId: string | null
  clientName: string
  clientPhone: string
  barberId: string | null
  serviceType: string
  bookingDate: string
  bookingTime: string
  duration: number
}

interface TimeSlot {
  time: string
  available: boolean
  reason?: string
  bookingCount?: number
  hasCompletedBooking?: boolean  // True if a completed booking exists at this time
  hasPendingBooking?: boolean     // True if a pending booking exists at this time
}

export const Bookings: React.FC = () => {
  useTranslation()
  const { loading, getTodayBookings, getUpcomingBookings, addBooking, updateBooking, deleteBooking } = useBookings()
  const { clients } = useClients()
  const { barbers } = useBarbers()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'today' | 'upcoming'>('today')
  const [searchResults, setSearchResults] = useState<typeof clients>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [previewInfo, setPreviewInfo] = useState<any>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [workingHours, setWorkingHours] = useState({ start: 9, end: 20 }) // 9 AM to 8 PM
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false)

  const [formData, setFormData] = useState<NewBooking>({
    searchQuery: '',
    clientId: null,
    clientName: '',
    clientPhone: '',
    barberId: null,
    serviceType: '',
    bookingDate: getEgyptDateString(),
    bookingTime: '10:00',
    duration: 30,
  })

  const todayBookings = getTodayBookings()
  const upcomingBookings = getUpcomingBookings()

  // حساب الأوقات المتاحة والمشغولة لحلاق محدد
  const calculateAvailableSlots = (date: string, selectedBarberId?: string) => {
    const slots: TimeSlot[] = []
    const intervalMinutes = 30

    // الحجوزات في هذا اليوم للحلاق المحدد (فقط pending/ongoing)
    const dayBookings = getTodayBookings().filter((b: any) => {
      const isCorrectDate = new Date(b.bookingTime).toLocaleDateString('en-CA') === date
      const isCorrectBarber = !selectedBarberId || b.barberId === selectedBarberId
      // استبعد الحجوزات المكتملة والملغاة - لا تحجز الوقت
      const isActive = b.status !== 'completed' && b.status !== 'cancelled'
      return isCorrectDate && isCorrectBarber && isActive
    })

    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      for (let min = 0; min < 60; min += intervalMinutes) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        const timeMs = hour * 60 + min

        // تحقق من التضاربات (30 دقيقة بافر) - فقط pending/ongoing
        const hasConflict = dayBookings.some((booking: any) => {
          const bookingHour = parseInt(booking.bookingTime.split('T')[1].substring(0, 2))
          const bookingMin = parseInt(booking.bookingTime.split('T')[1].substring(3, 5))
          const bookingTimeMs = bookingHour * 60 + bookingMin
          return Math.abs(timeMs - bookingTimeMs) < 30
        })

        // تحقق من الحجوزات المكتملة في هذا الوقت
        const allBookings = getTodayBookings().filter((b: any) => {
          const isCorrectDate = new Date(b.bookingTime).toLocaleDateString('en-CA') === date
          const isCorrectBarber = !selectedBarberId || b.barberId === selectedBarberId
          return isCorrectDate && isCorrectBarber
        })

        const completedBooking = allBookings.find((booking: any) => {
          const bookingHour = parseInt(booking.bookingTime.split('T')[1].substring(0, 2))
          const bookingMin = parseInt(booking.bookingTime.split('T')[1].substring(3, 5))
          const bookingTimeMs = bookingHour * 60 + bookingMin
          const timeMatch = Math.abs(timeMs - bookingTimeMs) < 30
          return timeMatch && booking.status === 'completed'
        })

        // تحقق من الحجوزات المعلقة في هذا الوقت
        const pendingBooking = allBookings.find((booking: any) => {
          const bookingHour = parseInt(booking.bookingTime.split('T')[1].substring(0, 2))
          const bookingMin = parseInt(booking.bookingTime.split('T')[1].substring(3, 5))
          const bookingTimeMs = bookingHour * 60 + bookingMin
          const timeMatch = Math.abs(timeMs - bookingTimeMs) < 30
          return timeMatch && booking.status !== 'completed' && booking.status !== 'cancelled'
        })

        slots.push({
          time: timeStr,
          available: !hasConflict,
          reason: hasConflict ? 'محجوز بالفعل' : undefined,
          bookingCount: dayBookings.filter((b: any) => {
            const bHour = parseInt(b.bookingTime.split('T')[1].substring(0, 2))
            return bHour === hour
          }).length,
          hasCompletedBooking: !!completedBooking,
          hasPendingBooking: !!pendingBooking,
        })
      }
    }

    return slots
  }

  // تحديث الأوقات عند تغيير التاريخ أو الحلاق
  React.useEffect(() => {
    if (formData.bookingDate) {
      const slots = calculateAvailableSlots(formData.bookingDate, formData.barberId || undefined)
      setAvailableSlots(slots)
    }
  }, [formData.bookingDate, formData.barberId])

  // تحديث معاينة الدور عند تغيير الوقت
  React.useEffect(() => {
    if (formData.bookingTime) {
      const dayBookings = getTodayBookings().filter(
        (b: any) => new Date(b.bookingTime).toLocaleDateString('en-CA') === formData.bookingDate
      )
      const queueNumber = (dayBookings.filter((b: any) => 
        parseInt(b.bookingTime.split('T')[1]) < parseInt(formData.bookingTime)
      ).length || 0) + 1

      const totalWaitMinutes = dayBookings
        .filter((b: any) => parseInt(b.bookingTime.split('T')[1]) < parseInt(formData.bookingTime))
        .reduce((sum, b: any) => sum + (b.duration || 30), 0)

      setPreviewInfo({
        queueNumber,
        estimatedWait: totalWaitMinutes,
      })
    }
  }, [formData.bookingTime, formData.bookingDate])

  // اختيار ذكي - إيجاد أفضل حلاق متاح
  const findBestBarberOption = (date: string): { barberId: string; barberName: string; firstAvailableTime: string; earliestHour: number } | null => {
    if (!barbers || barbers.length === 0) return null

    let bestOption: { barberId: string; barberName: string; firstAvailableTime: string; earliestHour: number } | null = null
    let earliestHour = 24

    barbers?.forEach((barber) => {
      if (!barber.id) return
      
      const slots = calculateAvailableSlots(date, barber.id)
      const firstAvailable = slots.find((s) => s.available)

      if (firstAvailable) {
        const hour = parseInt(firstAvailable.time.split(':')[0])
        if (hour < earliestHour) {
          earliestHour = hour
          bestOption = {
            barberId: barber.id,
            barberName: barber.name || '',
            firstAvailableTime: firstAvailable.time,
            earliestHour: hour,
          }
        }
      }
    })

    return bestOption
  }

  // Search for clients
  const handleClientSearch = (query: string) => {
    setFormData({ ...formData, searchQuery: query })

    if (query.length < 2) {
      setShowSearchResults(false)
      return
    }

    const filtered = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone.includes(query)
    )

    setSearchResults(filtered)
    setShowSearchResults(true)
  }

  const selectClient = (client: typeof clients[0]) => {
    setFormData({
      ...formData,
      searchQuery: '',
      clientId: client.id || null,
      clientName: client.name,
      clientPhone: client.phone,
    })
    setShowSearchResults(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Order: Barber → Client → Date/Time
    if (!formData.barberId) {
      toast.error('❌ الرجاء اختيار الحلاق أولاً')
      return
    }

    if (!formData.clientId) {
      toast.error('❌ الرجاء البحث عن العميل واختياره من القائمة')
      return
    }

    if (!formData.bookingDate || formData.bookingDate.trim() === '') {
      toast.error('❌ الرجاء تحديد التاريخ')
      return
    }

    if (!formData.bookingTime || formData.bookingTime.trim() === '') {
      toast.error('❌ الرجاء تحديد الوقت من القائمة أعلاه')
      return
    }

    // فحص صيغة التاريخ والوقت
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const timeRegex = /^\d{2}:\d{2}$/
    
    if (!dateRegex.test(formData.bookingDate)) {
      toast.error('❌ صيغة التاريخ غير صحيحة')
      return
    }

    if (!timeRegex.test(formData.bookingTime)) {
      toast.error('❌ صيغة الوقت غير صحيحة')
      return
    }

    // فحص إذا كان الوقت متاح
    const selectedSlot = availableSlots.find((s) => s.time === formData.bookingTime)
    if (selectedSlot && !selectedSlot.available) {
      toast.error(`⚠️ للأسف هذا الوقت ${selectedSlot.reason}!\nاختر أوقات أخرى في نفس اليوم`)
      return
    }

    try {
      const bookingTime = `${formData.bookingDate}T${formData.bookingTime}:00+02:00`

      // تحقق نهائي من صحة الوقت قبل الإرسال
      if (!bookingTime || bookingTime.trim() === '') {
        toast.error('❌ خطأ في إنشاء الوقت - يرجى المحاولة مرة أخرى')
        return
      }

      if (editingId) {
        // تعديل الحجز
        const updates: Partial<Booking> = {
          clientId: formData.clientId,
          clientName: formData.clientName,
          clientPhone: formData.clientPhone,
          barberId: formData.barberId || undefined,
          serviceType: formData.serviceType || undefined,
          bookingTime: bookingTime,
          duration: formData.duration,
        }

        await updateBooking(editingId, updates)
        setEditingId(null)
        toast.success('✅ تم تحديث الحجز بنجاح')
      } else {
        // إنشاء حجز جديد
        await addBooking({
          clientId: formData.clientId,
          clientName: formData.clientName,
          clientPhone: formData.clientPhone,
          barberId: formData.barberId || undefined,
          barberName: formData.barberId
            ? barbers?.find((b) => b.id === formData.barberId)?.name
            : undefined,
          serviceType: formData.serviceType || undefined,
          bookingTime: bookingTime,
          duration: formData.duration,
          status: 'pending',
          queueNumber: 0, // Will be calculated by addBooking
        } as any)
        toast.success('✅ تم إنشاء الحجز بنجاح')
      }

      // إعادة تعيين النموذج
      setFormData({
        searchQuery: '',
        clientId: null,
        clientName: '',
        clientPhone: '',
        barberId: null,
        serviceType: '',
        bookingDate: getEgyptDateString(),
        bookingTime: '10:00',
        duration: 30,
      })
      setShowModal(false)
    } catch (error: any) {
      console.error('Error saving booking:', error)
      
      // معالجة أخطاء قاعدة البيانات
      if (error.message?.includes('bookingtime') || error.message?.includes('NOT NULL')) {
        toast.error('❌ خطأ: الرجاء تحديد التاريخ والوقت بشكل صحيح')
      } else if (error.message?.includes('محجوز') || error.message?.includes('booked')) {
        toast.error('⚠️ هذا الموعد محجوز بالفعل - اختر وقت آخر')
      } else if (error.message?.includes('constraint')) {
        toast.error('❌ خطأ في البيانات - الرجاء التحقق من جميع الحقول')
      } else {
        toast.error(`❌ خطأ: ${error.message || 'حدث خطأ أثناء حفظ الحجز'}`)
      }
    }
  }

  const handleEdit = (booking: any) => {
    const bookingDate = booking.bookingtime.split('T')[0]
    const bookingTime = booking.bookingtime.split('T')[1]?.substring(0, 5) || '10:00'

    setFormData({
      searchQuery: '',
      clientId: booking.clientid,
      clientName: booking.clientname,
      clientPhone: booking.clientphone,
      barberId: booking.barberid || null,
      serviceType: booking.servicetype || '',
      bookingDate,
      bookingTime,
      duration: booking.duration || 30,
    })
    setEditingId(booking.id || null)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('هل متأكد من حذف هذا الحجز؟')) {
      await deleteBooking(id)
    }
  }

  const handleStatusChange = async (id: string, status: Booking['status']) => {
    await updateBooking(id, { status })
  }

  const currentBookings = viewMode === 'today' ? todayBookings : upcomingBookings

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin">
          <Calendar className="text-gold-400" size={40} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">الحجوزات</h1>
        <div className="flex gap-2">
          <motion.button
            onClick={() => setShowWorkingHoursModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg font-semibold hover:bg-blue-500/30 transition border border-blue-500/30"
            title="اضبط ساعات العمل"
          >
            <Clock size={18} />
            {workingHours.start}:00 - {workingHours.end}:00
          </motion.button>
          <motion.button
            onClick={() => {
              setEditingId(null)
              setFormData({
                searchQuery: '',
                clientId: null,
                clientName: '',
                clientPhone: '',
                barberId: null,
                serviceType: '',
                bookingDate: getEgyptDateString(),
                bookingTime: '10:00',
                duration: 30,
              })
              setShowModal(true)
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-gold-400 text-dark px-6 py-2 rounded-lg font-semibold hover:bg-gold-500 transition"
          >
            <Plus size={20} />
            حجز جديد
          </motion.button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-4 mb-8">
        <motion.button
          onClick={() => setViewMode('today')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition ${
            viewMode === 'today'
              ? 'bg-gold-400 text-dark'
              : 'bg-white/10 text-gray-300 hover:bg-white/15'
          }`}
        >
          <Clock size={18} />
          حجوزات اليوم ({todayBookings.length})
        </motion.button>
        <motion.button
          onClick={() => setViewMode('upcoming')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition ${
            viewMode === 'upcoming'
              ? 'bg-gold-400 text-dark'
              : 'bg-white/10 text-gray-300 hover:bg-white/15'
          }`}
        >
          <Calendar size={18} />
          الحجوزات القادمة ({upcomingBookings.length})
        </motion.button>
      </div>

      {/* Bookings Grid */}
      <div className="grid gap-4">
        <AnimatePresence>
          {currentBookings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-400"
            >
              <AlertCircle className="mx-auto mb-4 text-gold-400/50" size={40} />
              <p>لا توجد حجوزات في هذا الوقت</p>
            </motion.div>
          ) : (
            currentBookings.map((booking: any, index: number) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-dark rounded-lg p-6 border-2 transition ${
                  booking.status === 'completed'
                    ? 'border-green-500/50 bg-green-500/5'
                    : booking.status === 'cancelled'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-white/10'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex gap-2">
                      <div className="bg-gold-400/20 rounded-lg px-3 py-1">
                        <span className="text-gold-400 font-bold">#{booking.queueNumber}</span>
                      </div>
                      <div
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          booking.status === 'completed'
                            ? 'bg-green-500/30 text-green-300'
                            : booking.status === 'cancelled'
                            ? 'bg-red-500/30 text-red-300'
                            : booking.status === 'ongoing'
                            ? 'bg-blue-500/30 text-blue-300'
                            : 'bg-yellow-500/30 text-yellow-300'
                        }`}
                      >
                        {booking.status === 'completed'
                          ? '✅ اكتمل'
                          : booking.status === 'cancelled'
                          ? '❌ ملغى'
                          : booking.status === 'ongoing'
                          ? '⏳ جاري'
                          : '⏰ انتظار'}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{booking.clientName}</h3>
                      <p className="text-gray-400 text-sm">{booking.clientPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                      <motion.button
                        onClick={() => handleStatusChange(booking.id, 'completed')}
                        whileHover={{ scale: 1.1 }}
                        className="p-2 hover:bg-green-500/20 rounded transition text-green-400 border border-green-500/30"
                        title="تحديد كمكتمل"
                      >
                        <CheckCircle2 size={18} />
                      </motion.button>
                    )}
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(booking.id, e.target.value as Booking['status'])}
                      className={`px-3 py-1 rounded text-sm border focus:outline-none transition ${
                        booking.status === 'completed'
                          ? 'bg-green-500/20 text-green-300 border-green-500/40'
                          : booking.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-white/10 text-white border-white/20 focus:border-gold-400'
                      }`}
                    >
                      <option value="pending">في الانتظار</option>
                      <option value="ongoing">جاري</option>
                      <option value="completed">اكتمل</option>
                      <option value="cancelled">ملغى</option>
                    </select>
                    <motion.button
                      onClick={() => handleEdit(booking)}
                      whileHover={{ scale: 1.1 }}
                      className="p-2 hover:bg-white/10 rounded transition text-blue-400"
                    >
                      <Edit2 size={18} />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(booking.id)}
                      whileHover={{ scale: 1.1 }}
                      className="p-2 hover:bg-white/10 rounded transition text-red-400"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">الموعد</p>
                    <p className="text-white font-semibold">
                      {new Date(booking.bookingTime).toLocaleDateString('ar-EG')}
                    </p>
                    <p className="text-gold-400">
                      {new Date(booking.bookingTime).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {booking.queueInfo && (
                    <>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">أمامك في الدور</p>
                        <p className="text-white font-semibold text-lg">
                          {booking.queueInfo.peopleAhead}
                        </p>
                        <p className="text-gray-400 text-xs">شخص</p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">الانتظار المتوقع</p>
                        <p className="text-white font-semibold text-lg">
                          {booking.queueInfo.estimatedWaitMinutes}
                        </p>
                        <p className="text-gray-400 text-xs">دقيقة</p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">الوقت المتوقع</p>
                        <p className="text-gold-400 font-semibold text-sm">
                          {booking.queueInfo.estimatedStartTime}
                        </p>
                      </div>
                    </>
                  )}

                  {!booking.queueInfo && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">المدة</p>
                      <p className="text-white font-semibold">{booking.duration || 30}</p>
                      <p className="text-gray-400 text-xs">دقيقة</p>
                    </div>
                  )}
                </div>

                {(booking.barberName || booking.serviceType) && (
                  <div className="flex gap-4 text-sm">
                    {booking.barberName && (
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded">
                        <span className="text-gray-400">الحلاق:</span>
                        <span className="text-white font-semibold">{booking.barberName}</span>
                      </div>
                    )}
                    {booking.serviceType && (
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded">
                        <span className="text-gray-400">النوع:</span>
                        <span className="text-white font-semibold">{booking.serviceType}</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-dark rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gold-400/20"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingId ? 'تعديل الحجز' : 'حجز جديد'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded transition"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Barber Selection - FIRST STEP */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    ✂️ اختر الحلاق *
                  </label>
                  <div className="space-y-2">
                    <select
                      value={formData.barberId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormData({ ...formData, barberId: e.target.value })
                          setAvailableSlots([]) // إعادة تعيين الأوقات
                        }
                      }}
                      className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border-2 border-white/20 focus:border-gold-400 focus:outline-none"
                    >
                      <option value="">-- اختر الحلاق --</option>
                      {barbers
                        ?.filter((b) => b.active)
                        .map((barber) => (
                          <option key={barber.id} value={barber.id}>
                            ✂️ {barber.name}
                          </option>
                        ))}
                    </select>

                    {/* Smart Choice Button */}
                    {formData.bookingDate && !formData.barberId && (
                      <motion.button
                        type="button"
                        onClick={() => {
                          const best = findBestBarberOption(formData.bookingDate)
                          if (best) {
                            setFormData({
                              ...formData,
                              barberId: best.barberId,
                              bookingTime: best.firstAvailableTime,
                            })
                            toast.success(
                              `⚡ اختيار ذكي: ${best.barberName} متاح الساعة ${best.firstAvailableTime}`
                            )
                          } else {
                            toast.error('❌ لا توجد أوقات متاحة في هذا اليوم')
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        className="w-full bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg border-2 border-purple-500/30 hover:bg-purple-500/30 transition font-semibold flex items-center justify-center gap-2"
                      >
                        <Zap size={16} />
                        اختيار ذكي
                      </motion.button>
                    )}
                  </div>

                  {formData.barberId && (
                    <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm font-semibold">
                        ✓ {barbers?.find((b) => b.id === formData.barberId)?.name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Client Search */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    البحث عن عميل *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث عن الاسم أو رقم الهاتف"
                      value={formData.searchQuery}
                      onChange={(e) => handleClientSearch(e.target.value)}
                      className="w-full bg-white/15 text-white px-4 py-2 rounded-lg border-2 border-white/30 focus:border-gold-400 focus:outline-none focus:bg-white/20 transition placeholder-gray-300"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute top-full right-0 w-full mt-1 bg-gray-900 border-2 border-gold-400 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
                        {searchResults.map((client) => (
                          <motion.button
                            key={client.id}
                            type="button"
                            onClick={() => selectClient(client)}
                            whileHover={{ backgroundColor: '#D4AF37' }}
                            className="w-full text-right px-4 py-3 text-white hover:bg-gold-400 hover:text-dark transition border-b border-gray-700 last:border-b-0 font-medium"
                          >
                            <div className="font-semibold text-base">{client.name}</div>
                            <div className="text-xs text-gray-300">{client.phone}</div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  {formData.clientId && (
                    <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm font-semibold">
                        ✓ {formData.clientName} ({formData.clientPhone})
                      </p>
                    </div>
                  )}
                </div>

                {/* Date & Time Selection */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        📅 التاريخ *
                      </label>
                      <input
                        type="date"
                        value={formData.bookingDate}
                        onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                        className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border-2 border-white/20 focus:border-gold-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        ⏰ الوقت (اختر من القائمة) *
                      </label>
                      <select
                        value={formData.bookingTime || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData({ ...formData, bookingTime: e.target.value })
                          }
                        }}
                        className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border-2 border-white/20 focus:border-gold-400 focus:outline-none"
                      >
                        {availableSlots.length === 0 ? (
                          <option value="">-- اختر التاريخ أولاً --</option>
                        ) : (
                          <>
                            <option value="" disabled>-- اختر وقت متاح --</option>
                            {availableSlots.map((slot) => (
                              <option 
                                key={slot.time} 
                                value={slot.time}
                                disabled={!slot.available}
                              >
                                {slot.time} {slot.available ? '✓ متاح' : '✗ محجوز'}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Available Times Grid */}
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-xs text-gray-400 mb-3">
                      🟢 = متاح | 🔴 = محجوز (قيد الانتظار) | ✅ = اكتمل
                    </p>
                    <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <motion.button
                          key={slot.time}
                          type="button"
                          onClick={() => {
                            if (slot.available || slot.hasCompletedBooking) {
                              setFormData({ ...formData, bookingTime: slot.time })
                            }
                          }}
                          whileHover={slot.available && !slot.hasCompletedBooking ? { scale: 1.05 } : {}}
                          className={`py-2 px-1 rounded text-xs font-semibold text-center transition ${
                            slot.hasCompletedBooking
                              ? 'bg-green-500/40 text-green-300 border border-green-500/70 font-bold'
                              : slot.available
                              ? formData.bookingTime === slot.time
                                ? 'bg-gold-400 text-dark border-2 border-gold-400'
                                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                              : 'bg-red-500/40 text-red-300 border border-red-500/70 cursor-not-allowed opacity-75'
                          }`}
                          disabled={!slot.available && !slot.hasCompletedBooking}
                          title={
                            slot.hasCompletedBooking
                              ? 'تم بالفعل ✅'
                              : !slot.available
                              ? slot.reason
                              : 'متاح'
                          }
                        >
                          {slot.hasCompletedBooking ? '✅' : slot.available ? slot.time : '❌'}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Preview Info */}
                  {previewInfo && formData.bookingTime && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={18} className="text-blue-400" />
                        <p className="text-sm font-semibold text-blue-300">معاينة الحجز</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">رقمك في الدور:</span>
                          <p className="text-lg font-bold text-gold-400">#{previewInfo.queueNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">الانتظار المتوقع:</span>
                          <p className="text-lg font-bold text-white">{previewInfo.estimatedWait} دقيقة</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    مدة الخدمة (دقيقة)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-gold-400 focus:outline-none"
                  />
                </div>

                {/* Service Type (Optional) */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    نوع الخدمة (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثل: حلاقة عادية، حلاقة + لحية..."
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-gold-400 focus:outline-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-4 pt-4">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-gold-400 text-dark px-6 py-3 rounded-lg font-semibold hover:bg-gold-500 transition"
                  >
                    {editingId ? 'تحديث الحجز' : 'إنشاء الحجز'}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Working Hours Configuration Modal */}
      <AnimatePresence>
        {showWorkingHoursModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowWorkingHoursModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl max-w-md w-full border border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">⏰ ساعات العمل</h2>
                <button
                  onClick={() => setShowWorkingHoursModal(false)}
                  className="p-2 hover:bg-white/10 rounded transition"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    وقت البداية (من الساعة)
                  </label>
                  <select
                    value={workingHours.start}
                    onChange={(e) =>
                      setWorkingHours({
                        ...workingHours,
                        start: Math.min(parseInt(e.target.value), workingHours.end),
                      })
                    }
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-gold-400 focus:outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    وقت النهاية (إلى الساعة)
                  </label>
                  <select
                    value={workingHours.end}
                    onChange={(e) =>
                      setWorkingHours({
                        ...workingHours,
                        end: Math.max(parseInt(e.target.value), workingHours.start),
                      })
                    }
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-gold-400 focus:outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
                  💡 الساعات من {String(workingHours.start).padStart(2, '0')}:00 إلى{' '}
                  {String(workingHours.end).padStart(2, '0')}:00 ({workingHours.end - workingHours.start}{' '}
                  ساعة عمل)
                </div>

                <motion.button
                  type="button"
                  onClick={() => {
                    toast.success(
                      `✅ تم تحديث ساعات العمل: ${String(workingHours.start).padStart(2, '0')}:00 - ${String(workingHours.end).padStart(2, '0')}:00`
                    )
                    setShowWorkingHoursModal(false)
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gold-400 text-dark px-6 py-3 rounded-lg font-semibold hover:bg-gold-500 transition mt-6"
                >
                  حفظ ساعات العمل
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
