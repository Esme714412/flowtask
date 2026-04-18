import { useRef } from 'react'
import { supabase } from '../lib/supabase'

const NAV = [
  { id: 'dashboard', label: '儀表板',    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'list',      label: '任務清單',  icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'calendar',  label: '日曆',      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'gantt',     label: '甘特圖',    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'matrix',    label: '艾森豪矩陣', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { id: 'weekly',    label: '週報',      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'pomodoro',  label: '番茄鐘',    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'rewards',   label: '獎勵兌換',  icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
]

const XP_PER_LEVEL = 500
const calcLevel = (xp) => Math.floor((xp || 0) / XP_PER_LEVEL) + 1

export default function Sidebar({ view, setView, theme, toggleTheme, collapsed, setCollapsed, mobileOpen, session, profile }) {
  const asideRef = useRef(null)
  const user = session?.user
  const lv = calcLevel(profile?.xp)
  const xpCurrent = (profile?.xp || 0) % XP_PER_LEVEL
  const prog = (xpCurrent / XP_PER_LEVEL) * 100

  const handleCollapse = () => {
    const aside = asideRef.current
    if (!collapsed) {
      aside.classList.add('collapsing')
      setTimeout(() => {
        aside.classList.remove('collapsing')
        setCollapsed(true)
      }, 110)
    } else {
      setCollapsed(false)
    }
  }

  return (
    <aside
      id="sidebar"
      ref={asideRef}
      className={`flex flex-col border-r${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
      style={{ width: 220, minWidth: 220, borderColor: 'var(--border2)', padding: '10px 8px' }}
    >
      {/* Top: toggle + logo */}
      <div className="flex items-center justify-between mb-4 px-1">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-sky-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">F</div>
            <span className="text-sm font-semibold hide-collapsed" style={{ color: 'var(--text)' }}>FlowTask</span>
          </div>
        )}
        <button onClick={handleCollapse} className="sidebar-icon-btn" style={{ marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0 }} title={collapsed ? '展開' : '收合'}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d={collapsed
                ? 'M4 6h16M4 12h16M4 18h16'
                : 'M4 6h16M4 12h10M4 18h16'} />
          </svg>
        </button>
      </div>

      {/* User avatar + info */}
      <div className="flex items-center gap-2 mb-3 pb-3 px-1" style={{ borderBottom: '1px solid var(--border2)' }}>
        {user?.user_metadata?.avatar_url
          ? <img src={user.user_metadata.avatar_url} className="w-7 h-7 rounded-full flex-shrink-0" alt="" style={{ margin: collapsed ? 'auto' : 0 }} />
          : <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ margin: collapsed ? 'auto' : 0 }}>
              {(user?.email?.[0] || 'U').toUpperCase()}
            </div>}
        {!collapsed && (
          <div className="flex-1 min-w-0 hide-collapsed">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {user?.user_metadata?.full_name || user?.email}
            </div>
            <div className="text-xs text-sky-400">Lv.{lv} · {profile?.xp || 0} XP</div>
          </div>
        )}
      </div>

      {/* XP bar */}
      {!collapsed && (
        <div className="px-1 mb-4 hide-collapsed">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text3)' }}>
            <span>{xpCurrent} / {XP_PER_LEVEL} XP</span><span>Lv.{lv + 1}</span>
          </div>
          <div className="prog-bar"><div className="prog-fill bg-sky-400 xp-glow" style={{ width: `${prog}%` }} /></div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV.map(({ id, label, icon }) => (
          <div key={id}
            className={`nav-item${view === id ? ' active' : ''}`}
            onClick={() => setView(id)}
            title={collapsed ? label : undefined}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
            {!collapsed && <span className="hide-collapsed">{label}</span>}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom mt-auto pt-3 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border2)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2 px-1 mb-1 hide-collapsed" style={{ color: 'var(--text3)', fontSize: 13 }}>
            <span>🔥</span>
            <span className="font-semibold text-orange-400">{profile?.streak || 0} 天</span>
            <span>連續</span>
          </div>
        )}

        <button onClick={toggleTheme} className="sidebar-icon-btn hide-collapsed" style={{ width: '100%', gap: 8, paddingLeft: 10, justifyContent: 'flex-start', display: collapsed ? 'none' : 'flex' }}>
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="text-xs">{theme === 'dark' ? '白色模式' : '黑色模式'}</span>
        </button>
        <button onClick={toggleTheme} className="sidebar-icon-btn" style={{ margin: 'auto', display: collapsed ? 'flex' : 'none' }}>
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>

        {!collapsed && (
          <button onClick={() => supabase.auth.signOut()}
            className="hide-collapsed text-xs py-1.5 rounded-lg transition hover:opacity-80"
            style={{ color: 'var(--text3)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', paddingLeft: 10 }}>
            登出
          </button>
        )}
      </div>
    </aside>
  )
}
