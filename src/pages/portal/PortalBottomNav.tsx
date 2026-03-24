import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Home, Calendar, History, User } from 'lucide-react'

interface PortalBottomNavProps {
  primaryColor?: string
}

const navItems = [
  { key: 'dashboard', label: 'الرئيسية', path: 'dashboard', icon: Home },
  { key: 'bookings', label: 'المواعيد', path: 'bookings', icon: Calendar },
  { key: 'history', label: 'السجل', path: 'history', icon: History },
  { key: 'profile', label: 'البيانات', path: 'profile', icon: User }
]

export function PortalBottomNav({ primaryColor = '#D4AF37' }: PortalBottomNavProps) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Get current page from pathname
  const currentPage = location.pathname.split('/').pop() || 'dashboard'

  const handleNavigate = (path: string) => {
    navigate(`/shop/${slug}/${path}`)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: 'rgba(10, 15, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 100,
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))'
      }}
    >
      {navItems.map((item) => {
        const isActive = currentPage === item.path
        const Icon = item.icon

        return (
          <button
            key={item.key}
            onClick={() => handleNavigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              transition: 'all 0.3s ease',
              color: isActive ? primaryColor : 'rgba(255, 255, 255, 0.5)'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.8)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255, 255, 255, 0.5)'
              }
            }}
          >
            <Icon size={24} />
            <span style={{ fontSize: '11px', fontWeight: isActive ? '600' : '500', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
