import { useParams } from 'react-router-dom'
import { Globe } from 'lucide-react'

type Language = 'ar' | 'en'

interface PortalLanguageToggleProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
}

export function PortalLanguageToggle({ currentLanguage, onLanguageChange }: PortalLanguageToggleProps) {
  const { slug } = useParams<{ slug: string }>()

  const handleToggle = () => {
    const newLang = currentLanguage === 'ar' ? 'en' : 'ar'
    onLanguageChange(newLang)
    localStorage.setItem(`portal_lang_${slug}`, newLang)
  }

  return (
    <button
      onClick={handleToggle}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)'
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget
        target.style.background = 'rgba(255, 255, 255, 0.15)'
        target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget
        target.style.background = 'rgba(255, 255, 255, 0.1)'
        target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
      }}
    >
      <Globe size={16} />
      <span>{currentLanguage === 'ar' ? 'EN' : 'ع'}</span>
    </button>
  )
}
