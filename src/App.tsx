import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { POS } from './pages/POS'
import { Clients } from './pages/Clients'
import { Services } from './pages/Services'
import { Expenses } from './pages/Expenses'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'
import { DailyLogs } from './pages/DailyLogs'
import { Barbers } from './pages/Barbers'
import { useTheme } from './hooks/useTheme'
import { useLanguage } from './hooks/useLanguage'
import { seedSampleData } from './utils/seedData'

function App() {
  const [currentPage, setCurrentPage] = useState('/')
  const { theme } = useTheme()
  const { language } = useLanguage()

  // Initialize sample data on first load
  useEffect(() => {
    seedSampleData()
  }, [])

  // Update document attributes for theme and language
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [language, theme])

  const renderPage = () => {
    switch (currentPage) {
      case '/':
        return <Dashboard />
      case '/pos':
        return <POS />
      case '/clients':
        return <Clients />
      case '/barbers':
        return <Barbers />
      case '/services':
        return <Services />
      case '/logs':
        return <DailyLogs />
      case '/expenses':
        return <Expenses />
      case '/analytics':
        return <Analytics />
      case '/settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className={theme === 'dark' ? 'dark' : 'light'}>
      <Layout currentPath={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
      <Toaster position="bottom-center" />
    </div>
  )
}

export default App
