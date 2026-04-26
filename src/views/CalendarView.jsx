import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const WEEKDAYS_SUN  = ['日', '一', '二', '三', '四', '五', '六']
const WEEKDAYS_MON  = ['一', '二', '三', '四', '五', '六', '日']
const MONTHS        = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const IMP_COLOR     = ['', '#94a3b8', '#60a5fa', '#facc15', '#fb923c', '#ef4444']

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtDisp(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function chipColors(task) {
  if (task.status === 'done') return { border: 'var(--border2)', bg: 'transparent' }
  const imp = task.importance || 3
  if (imp >= 5) return { border: 'rgba(239,68,68,.4)',  bg: 'rgba(239,68,68,.07)' }
  if (imp >= 4) return { border: 'rgba(251,146,60,.4)', bg: 'rgba(251,146,60,.07)' }
  if (imp >= 3) return { border: 'rgba(234,179,8,.4)',  bg: 'rgba(234,179,8,.07)' }
  return        { border: 'rgba(34,197,94,.35)',  bg: 'rgba(34,197,94,.06)' }
}

export default function CalendarView({ onNewTask, onEditTask, session, taskVersion }) {
  const today = toYMD(new Date())

  const [calMode,    setCalMode]    = useState('week')
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)

  // month view
  const [year,  setYear]  = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())

  // week view
  const [weekMonday, setWeekMonday] = useState(() => getMondayOf(new Date()))
  const [miniYear,   setMiniYear]   = useState(new Date().getFullYear())
  const [miniMonth,  setMiniMonth]  = useState(new Date().getMonth())

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevMonth = () => month === 0  ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1)
  const nextMonth = () => month === 11 ? (setMonth(0),  setYear(y => y+1)) : setMonth(m => m+1)

  const prevWeek = () => {
    const d = new Date(weekMonday); d.setDate(d.getDate() - 7)
    setWeekMonday(d); setMiniYear(d.getFullYear()); setMiniMonth(d.getMonth())
  }
  const nextWeek = () => {
    const d = new Date(weekMonday); d.setDate(d.getDate() + 7)
    setWeekMonday(d); setMiniYear(d.getFullYear()); setMiniMonth(d.getMonth())
  }

  const prevMiniMonth = () => {
    if (miniMonth === 0) { setMiniMonth(11); setMiniYear(y => y-1) } else setMiniMonth(m => m-1)
  }
  const nextMiniMonth = () => {
    if (miniMonth === 11) { setMiniMonth(0); setMiniYear(y => y+1) } else setMiniMonth(m => m+1)
  }

  const goToday = () => {
    setYear(new Date().getFullYear()); setMonth(new Date().getMonth())
    const mon = getMondayOf(new Date())
    setWeekMonday(mon); setMiniYear(mon.getFullYear()); setMiniMonth(mon.getMonth())
  }

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    let startDate, endDate
    if (calMode === 'month') {
      startDate = toYMD(new Date(year, month, 1))
      endDate   = toYMD(new Date(year, month + 1, 0))
    } else {
      startDate = toYMD(weekMonday)
      const sun = new Date(weekMonday); sun.setDate(sun.getDate() + 6)
      endDate = toYMD(sun)
    }
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, importance, status, projects(name, color)')
      .eq('user_id', session.user.id)
      .in('status', ['todo', 'done'])
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('importance', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }, [session.user.id, year, month, calMode, weekMonday])

  useEffect(() => { fetchTasks() }, [fetchTasks, taskVersion])

  const tasksByDate = tasks.reduce((acc, t) => {
    if (!t.due_date) return acc
    acc[t.due_date] = acc[t.due_date] || []
    acc[t.due_date].push(t)
    return acc
  }, {})

  // ── Month view cells ─────────────────────────────────────────────────────────
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays    = new Date(year, month, 0).getDate()
  const monthCells  = []
  for (let i = firstDay - 1; i >= 0; i--) monthCells.push({ day: prevDays - i, cur: false })
  for (let d = 1; d <= daysInMonth; d++)  monthCells.push({ day: d, cur: true })
  while (monthCells.length % 7 !== 0)     monthCells.push({ day: monthCells.length - firstDay - daysInMonth + 1, cur: false })

  // ── Mini calendar weeks ──────────────────────────────────────────────────────
  const miniFirstDay  = new Date(miniYear, miniMonth, 1).getDay()
  const miniDaysInMon = new Date(miniYear, miniMonth + 1, 0).getDate()
  const miniCells = []
  for (let i = 0; i < miniFirstDay; i++) miniCells.push(null)
  for (let d = 1; d <= miniDaysInMon; d++) miniCells.push(d)
  while (miniCells.length % 7) miniCells.push(null)
  const miniWeeks = []
  for (let i = 0; i < miniCells.length; i += 7) miniWeeks.push(miniCells.slice(i, i + 7))

  // ── Week grid days ───────────────────────────────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday); d.setDate(d.getDate() + i); return d
  })
  const weekSunday = new Date(weekMonday); weekSunday.setDate(weekSunday.getDate() + 6)

  // ── Shared nav button style ──────────────────────────────────────────────────
  const navBtn = {
    background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)',
  }

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>日曆</h1>
          {calMode === 'month' && (
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:opacity-80" style={navBtn}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              </button>
              <span className="text-sm font-semibold min-w-20 text-center" style={{ color: 'var(--text)' }}>{year} 年 {MONTHS[month]}</span>
              <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:opacity-80" style={navBtn}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80" style={navBtn}>
            今天
          </button>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {[['month','月'], ['week','週']].map(([mode, label], i) => (
              <button key={mode} onClick={() => setCalMode(mode)}
                className="px-3 py-1.5 text-xs transition"
                style={{
                  background: calMode === mode ? 'var(--surface)' : 'var(--bg2)',
                  color:      calMode === mode ? 'var(--text)'    : 'var(--text3)',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  fontWeight: calMode === mode ? 600 : 400,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MONTH VIEW ══ */}
      {calMode === 'month' && (
        <div className="card flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
              {WEEKDAYS_SUN.map((d, i) => (
                <div key={d} className="py-2 text-center text-xs font-semibold"
                  style={{ color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'var(--text3)' }}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${monthCells.length / 7}, minmax(0, 1fr))` }}>
              {monthCells.map((cell, idx) => {
                const ymd      = cell.cur
                  ? toYMD(new Date(year, month, cell.day))
                  : cell.day < 10 && idx < 7
                    ? toYMD(new Date(year, month - 1 < 0 ? 11 : month - 1, cell.day))
                    : toYMD(new Date(year, month + 1 > 11 ? 0 : month + 1, cell.day))
                const dayTasks = cell.cur ? (tasksByDate[ymd] || []) : []
                const isToday  = ymd === today
                const isSun    = idx % 7 === 0
                const isSat    = idx % 7 === 6
                return (
                  <div key={idx} className="flex flex-col p-1 cursor-pointer transition-colors"
                    style={{
                      borderRight:  idx % 7 !== 6 ? '1px solid var(--border2)' : 'none',
                      borderBottom: idx < monthCells.length - 7 ? '1px solid var(--border2)' : 'none',
                      background:   isToday ? 'var(--bg2)' : 'transparent',
                      overflow:     'hidden',
                    }}
                    onClick={() => cell.cur && onNewTask(ymd)}>
                    <div className="flex justify-end mb-0.5">
                      <span className="text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium"
                        style={{
                          background: isToday ? '#0284c7' : 'transparent',
                          color: isToday ? '#fff' : !cell.cur ? 'var(--text3)' : isSun ? '#f87171' : isSat ? '#60a5fa' : 'var(--text)',
                        }}>
                        {cell.day}
                      </span>
                    </div>
                    {loading && cell.cur && idx === firstDay && (
                      <div className="text-xs" style={{ color: 'var(--text3)' }}>載入中…</div>
                    )}
                    {dayTasks.slice(0, 3).map(t => (
                      <div key={t.id}
                        className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer transition hover:opacity-80"
                        style={{
                          background:     t.projects?.color ? t.projects.color + '22' : 'var(--bg2)',
                          color:          t.projects?.color || IMP_COLOR[t.importance] || 'var(--text2)',
                          border:         `1px solid ${t.projects?.color ? t.projects.color + '44' : 'var(--border)'}`,
                          textDecoration: t.status === 'done' ? 'line-through' : 'none',
                          opacity:        t.status === 'done' ? 0.6 : 1,
                        }}
                        onClick={e => { e.stopPropagation(); onEditTask(t) }}>
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs px-1" style={{ color: 'var(--text3)' }}>+{dayTasks.length - 3} 筆</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
      )}

      {/* ══ WEEK VIEW ══ */}
      {calMode === 'week' && (
        <div className="flex gap-4 flex-1 min-h-0">

          {/* ── Left: mini calendar ── */}
          <div style={{ width: 196, flexShrink: 0 }}>
            <div className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <button onClick={prevMiniMonth}
                  className="w-6 h-6 flex items-center justify-center rounded transition hover:opacity-80 text-base leading-none"
                  style={{ background: 'var(--bg2)', color: 'var(--text2)', border: 'none', cursor: 'pointer' }}>‹</button>
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                  {miniYear} 年 {MONTHS[miniMonth]}
                </span>
                <button onClick={nextMiniMonth}
                  className="w-6 h-6 flex items-center justify-center rounded transition hover:opacity-80 text-base leading-none"
                  style={{ background: 'var(--bg2)', color: 'var(--text2)', border: 'none', cursor: 'pointer' }}>›</button>
              </div>

              {/* Day headers (Sun-first) */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS_SUN.map(d => (
                  <div key={d} className="text-center" style={{ fontSize: 9, color: 'var(--text3)', padding: '2px 0' }}>{d}</div>
                ))}
              </div>

              {/* Week rows */}
              {miniWeeks.map((week, ri) => {
                const firstD  = week.find(d => d !== null)
                if (firstD == null) return null
                const rowMon  = getMondayOf(new Date(miniYear, miniMonth, firstD))
                const isSel   = rowMon.getTime() === weekMonday.getTime()
                return (
                  <div key={ri}
                    className="grid grid-cols-7 rounded cursor-pointer"
                    style={{ marginBottom: 2, background: isSel ? 'rgba(14,165,233,.2)' : 'transparent', transition: 'background .12s' }}
                    onClick={() => { if (!isSel) setWeekMonday(rowMon) }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(14,165,233,.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(14,165,233,.2)' : 'transparent' }}>
                    {week.map((d, ci) => {
                      const isTodayCell = d !== null && toYMD(new Date(miniYear, miniMonth, d)) === today
                      return (
                        <div key={ci} style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {d !== null && (
                            isTodayCell
                              ? <span style={{ width: 20, height: 20, background: '#0ea5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>{d}</span>
                              : <span style={{ fontSize: 10, color: isSel ? 'white' : 'var(--text2)', fontWeight: isSel ? 500 : 400 }}>{d}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Right: week grid ── */}
          <div className="flex-1 flex flex-col min-w-0 gap-3">
            {/* Week navigation */}
            <div className="flex items-center justify-between">
              <button onClick={prevWeek} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80" style={navBtn}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                上一週
              </button>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {fmtDisp(weekMonday)} – {fmtDisp(weekSunday)}
              </span>
              <button onClick={nextWeek} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80" style={navBtn}>
                下一週
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>

            {/* 7-column grid */}
            <div className="grid grid-cols-7 gap-2 flex-1 overflow-y-auto">
              {weekDays.map((day, i) => {
                const dayStr   = toYMD(day)
                const isToday  = dayStr === today
                const dayTasks = tasksByDate[dayStr] || []
                const doneCnt  = dayTasks.filter(t => t.status === 'done').length

                return (
                  <div key={i} className="flex flex-col min-w-0">
                    {/* Day header */}
                    <div className="text-center py-2 px-1 rounded-lg mb-2 cursor-pointer transition hover:opacity-90"
                      style={{
                        background: isToday ? '#0284c7' : 'var(--surface)',
                        border: `1px solid ${isToday ? '#0ea5e9' : 'var(--border)'}`,
                      }}
                      onClick={() => onNewTask(dayStr)}>
                      <div style={{ fontSize: 10, color: isToday ? 'rgba(255,255,255,.75)' : 'var(--text3)' }}>
                        {WEEKDAYS_MON[i]}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2, color: isToday ? 'white' : 'var(--text)' }}>
                        {day.getDate()}
                      </div>
                      <div style={{ fontSize: 9, marginTop: 2, color: isToday ? 'rgba(255,255,255,.6)' : dayTasks.length ? 'var(--text3)' : 'transparent' }}>
                        {dayTasks.length ? `${doneCnt}/${dayTasks.length} 完成` : '—'}
                      </div>
                    </div>

                    {/* Task chips */}
                    {loading && i === 0 && (
                      <div className="text-xs text-center" style={{ color: 'var(--text3)' }}>載入中…</div>
                    )}
                    {dayTasks.map(t => {
                      const { border, bg } = chipColors(t)
                      const projColor = t.projects?.color
                      return (
                        <div key={t.id}
                          className="cursor-pointer transition-opacity hover:opacity-75"
                          style={{
                            padding: '5px 7px', borderRadius: 6,
                            border: `1px solid ${border}`, background: bg,
                            marginBottom: 4,
                            opacity: t.status === 'done' ? 0.5 : 1,
                          }}
                          onClick={() => onEditTask(t)}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 2 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: projColor || IMP_COLOR[t.importance] || 'var(--text3)', flexShrink: 0, marginTop: 3, display: 'inline-block' }} />
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              color: t.status === 'done' ? 'var(--text3)' : 'var(--text)',
                              textDecoration: t.status === 'done' ? 'line-through' : 'none',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              lineHeight: 1.35,
                            }}>
                              {t.title}
                            </span>
                          </div>
                          <div style={{ fontSize: 9, color: t.status === 'done' ? '#22c55e' : 'var(--text3)' }}>
                            {t.status === 'done' ? '✓ 完成' : (t.projects?.name || '')}
                          </div>
                        </div>
                      )
                    })}

                    {!loading && !dayTasks.length && (
                      <div className="text-center rounded-lg cursor-pointer transition hover:opacity-70"
                        style={{ padding: '16px 4px', fontSize: 10, color: 'var(--text3)', border: '1px dashed var(--border2)' }}
                        onClick={() => onNewTask(dayStr)}>
                        + 新增
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
