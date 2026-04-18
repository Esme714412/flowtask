export default function MobileTopbar({ theme, onToggleTheme }) {
  return (
    <div className="mobile-topbar">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-sky-500 flex items-center justify-center text-white font-bold text-xs">F</div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>FlowTask</span>
      </div>
      <button onClick={onToggleTheme}
        className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--surface)', color: 'var(--text2)' }}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
