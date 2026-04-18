import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import MobileTopbar from './components/MobileTopbar'
import MobileBottomNav from './components/MobileBottomNav'
import LoginPage from './views/LoginPage'
import Dashboard from './views/Dashboard'
import TaskList from './views/TaskList'
import CalendarView from './views/CalendarView'
import GanttView from './views/GanttView'
import MatrixView from './views/MatrixView'
import WeeklyView from './views/WeeklyView'
import PomodoroView from './views/PomodoroView'
import RewardsView from './views/RewardsView'
import TaskModal from './components/TaskModal'

const VIEW_MAP = {
  dashboard: Dashboard,
  list:      TaskList,
  calendar:  CalendarView,
  gantt:     GanttView,
  matrix:    MatrixView,
  weekly:    WeeklyView,
  pomodoro:  PomodoroView,
  rewards:   RewardsView,
}

export default function App() {
  const [session, setSession]             = useState(undefined)
  const [profile, setProfile]             = useState(null)
  const [theme, setTheme]                 = useState('dark')
  const [view, setView]                   = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask]     = useState(null)
  const [taskVersion, setTaskVersion]     = useState(0)

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: created } = await supabase.from('profiles').upsert({
        id: userId,
        display_name: user?.user_metadata?.full_name || '',
        avatar_url:   user?.user_metadata?.avatar_url || '',
      }, { onConflict: 'id' }).select().single()
      setProfile(created)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) fetchProfile(s.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light')
  }, [theme])

  const toggleTheme  = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const openNewTask  = () => { setEditingTask(null); setTaskModalOpen(true) }
  const openEditTask = (task) => { setEditingTask(task); setTaskModalOpen(true) }

  if (session === undefined) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <LoginPage />

  const ViewComponent = VIEW_MAP[view] || Dashboard

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }}
      />

      <div className="mobile-overlay" id="mobile-overlay"
        style={{ display: mobileSidebarOpen ? 'block' : 'none' }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <MobileTopbar
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sidebar
          view={view}
          setView={(v) => { setView(v); setMobileSidebarOpen(false) }}
          theme={theme}
          toggleTheme={toggleTheme}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          session={session}
          profile={profile}
        />
        <main className="flex-1 overflow-auto p-6">
          <ViewComponent
            onNewTask={openNewTask}
            onEditTask={openEditTask}
            onSwitchView={setView}
            session={session}
            profile={profile}
            onProfileUpdate={(updates) => updates
              ? setProfile(prev => ({ ...prev, ...updates }))
              : fetchProfile(session.user.id)}
            taskVersion={taskVersion}
          />
        </main>
      </div>

      <MobileBottomNav view={view} setView={setView} />

      {taskModalOpen && (
        <TaskModal
          task={editingTask}
          onClose={() => setTaskModalOpen(false)}
          onSaved={() => setTaskVersion(v => v + 1)}
          session={session}
        />
      )}
    </div>
  )
}
