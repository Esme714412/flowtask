import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const MODE_META = [
  { id: 'work',  label: '工作'   },
  { id: 'short', label: '短休息' },
  { id: 'long',  label: '長休息' },
]
const DEFAULTS = { work: 25, short: 5, long: 15 }
const XP_PER_POMODORO = 20
const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function loadDurations() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('pomo_settings')) } }
  catch { return DEFAULTS }
}

export default function PomodoroView({ session, profile, onProfileUpdate }) {
  const [durations, setDurations] = useState(loadDurations)
  const [modeIdx,   setModeIdx]   = useState(0)
  const [seconds,   setSeconds]   = useState(() => loadDurations().work * 60)
  const [running,   setRunning]   = useState(false)
  const [count,     setCount]     = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draft,     setDraft]     = useState(loadDurations)
  const intervalRef = useRef(null)

  const modes  = MODE_META.map(m => ({ ...m, minutes: durations[m.id] }))
  const mode   = modes[modeIdx]
  const total  = mode.minutes * 60
  const offset = CIRCUMFERENCE * (seconds / total)
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    setRunning(false)
  }, [])

  const onComplete = useCallback(async () => {
    stop()
    if (modeIdx === 0) {
      const newCount = count + 1
      setCount(newCount)
      toast.success(`番茄完成！+${XP_PER_POMODORO} XP`, { icon: '🍅' })
      if (session) {
        const newXp = (profile?.xp || 0) + XP_PER_POMODORO
        await supabase.from('profiles').update({ xp: newXp }).eq('id', session.user.id)
        onProfileUpdate?.()
      }
      const nextIdx = newCount % 4 === 0 ? 2 : 1
      setModeIdx(nextIdx)
      setSeconds(modes[nextIdx].minutes * 60)
    } else {
      toast('休息結束，準備好了嗎？', { icon: '⏰' })
      setModeIdx(0)
      setSeconds(modes[0].minutes * 60)
    }
  }, [stop, modeIdx, count, session, profile, onProfileUpdate, modes])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSeconds(s => { if (s <= 1) { onComplete(); return 0 } return s - 1 })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, onComplete])

  useEffect(() => {
    document.title = running ? `${mm}:${ss} — ${mode.label}` : 'FlowTask'
    return () => { document.title = 'FlowTask' }
  }, [running, mm, ss, mode.label])

  const switchMode = (idx) => { stop(); setModeIdx(idx); setSeconds(modes[idx].minutes * 60) }
  const toggleRun  = () => setRunning(r => !r)
  const reset      = () => { stop(); setSeconds(mode.minutes * 60) }

  const saveSettings = () => {
    const clamped = {
      work:  Math.min(99, Math.max(1, Number(draft.work)  || DEFAULTS.work)),
      short: Math.min(99, Math.max(1, Number(draft.short) || DEFAULTS.short)),
      long:  Math.min(99, Math.max(1, Number(draft.long)  || DEFAULTS.long)),
    }
    localStorage.setItem('pomo_settings', JSON.stringify(clamped))
    setDurations(clamped)
    stop()
    setSeconds(clamped[MODE_META[modeIdx].id] * 60)
    setSettingsOpen(false)
    toast.success('設定已儲存')
  }

  const ringColor = modeIdx === 0 ? '#0284c7' : modeIdx === 1 ? '#34d399' : '#a78bfa'
  const filledCount = count % 4 || (count > 0 && count % 4 === 0 ? 4 : 0)

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>番茄鐘</h1>
        <button onClick={() => { setDraft({ ...durations }); setSettingsOpen(v => !v) }}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)' }}
          title="設定">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="card p-4 w-full max-w-sm flex flex-col gap-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>時間設定（分鐘）</p>
          {MODE_META.map(m => (
            <div key={m.id} className="flex items-center justify-between">
              <label className="text-sm" style={{ color: 'var(--text2)' }}>{m.label}</label>
              <input type="number" min={1} max={99}
                className="w-20 px-2 py-1 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-sky-500"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={draft[m.id]}
                onChange={e => setDraft(d => ({ ...d, [m.id]: e.target.value }))} />
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <button onClick={() => setSettingsOpen(false)}
              className="flex-1 py-1.5 rounded-lg text-sm transition hover:opacity-80"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
              取消
            </button>
            <button onClick={saveSettings} className="flex-1 py-1.5 rounded-lg text-sm btn-primary transition">
              儲存
            </button>
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {modes.map((m, i) => (
          <button key={m.id} onClick={() => switchMode(i)}
            className="px-4 py-1.5 rounded-lg text-sm transition"
            style={{
              background: modeIdx === i ? 'var(--surface)' : 'transparent',
              color:      modeIdx === i ? 'var(--text)' : 'var(--text3)',
              fontWeight: modeIdx === i ? 600 : 400,
              boxShadow:  modeIdx === i ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="relative flex items-center justify-center">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="var(--prog-bg)" strokeWidth="8" />
          <circle cx="80" cy="80" r={RADIUS} fill="none" stroke={ringColor} strokeWidth="8"
            strokeLinecap="round" className="pomo-ring"
            style={{ strokeDashoffset: offset }} transform="rotate(-90 80 80)" />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{mm}:{ss}</span>
          <span className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{mode.label} · {mode.minutes} 分鐘</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={reset}
          className="w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-80"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)' }} title="重置">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button onClick={toggleRun}
          className="w-16 h-16 rounded-full flex items-center justify-center transition hover:opacity-80 btn-primary">
          {running
            ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
            : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg>
          }
        </button>
        <button onClick={() => onComplete()}
          className="w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-80"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)' }} title="跳過">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Pomodoro count */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
              style={{ background: i < filledCount ? '#ef4444' : 'var(--bg2)', border: '1px solid var(--border)' }}>
              {i < filledCount ? '🍅' : ''}
            </div>
          ))}
        </div>
        {count > 0 && (
          <span className="text-xs" style={{ color: 'var(--text3)' }}>今日完成 {count} 個番茄</span>
        )}
      </div>
    </div>
  )
}
