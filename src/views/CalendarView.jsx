import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS   = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const IMP_COLOR = ['', '#94a3b8', '#60a5fa', '#facc15', '#fb923c', '#ef4444']

export default function CalendarView({ onNewTask, onEditTask, session, taskVersion }) {
  const today = toYMD(new Date())
  const [year,  setYear]  = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }
  const goToday   = () => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()) }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays    = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, cur: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, cur: true })
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - firstDay - daysInMonth + 1, cur: false })

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const startDate = toYMD(new Date(year, month, 1))
    const endDate   = toYMD(new Date(year, month + 1, 0))
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
  }, [session.user.id, year, month])

  useEffect(() => { fetchTasks() }, [fetchTasks, taskVersion])

  const tasksByDate = tasks.reduce((acc, t) => {
    if (!t.due_date) return acc
    acc[t.due_date] = acc[t.due_date] || []
    acc[t.due_date].push(t)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>日曆</h1>
        <div className="flex items-center gap-2">
          <button onClick={goToday}
            className="text-xs px-3 py-1.5 rounded-lg transition hover:opacity-80"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            今天
          </button>
          <button onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-base font-semibold min-w-24 text-center" style={{ color: 'var(--text)' }}>
            {year} 年 {MONTHS[month]}
          </span>
          <button onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} className="py-2 text-center text-xs font-semibold"
              style={{ color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'var(--text3)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${cells.length / 7}, 1fr)` }}>
          {cells.map((cell, idx) => {
            const ymd = cell.cur
              ? toYMD(new Date(year, month, cell.day))
              : cell.day < 10 && idx < 7
                ? toYMD(new Date(year, month - 1 < 0 ? 11 : month - 1, cell.day))
                : toYMD(new Date(year, month + 1 > 11 ? 0 : month + 1, cell.day))
            const dayTasks = cell.cur ? (tasksByDate[ymd] || []) : []
            const isToday  = ymd === today
            const isSun    = idx % 7 === 0
            const isSat    = idx % 7 === 6

            return (
              <div key={idx}
                className="flex flex-col p-1 cursor-pointer transition-colors"
                style={{
                  borderRight:  idx % 7 !== 6 ? `1px solid var(--border2)` : 'none',
                  borderBottom: idx < cells.length - 7 ? `1px solid var(--border2)` : 'none',
                  background:   isToday ? 'var(--bg2)' : 'transparent',
                  minHeight: 80,
                }}
                onClick={() => cell.cur && onNewTask(ymd)}>

                {/* Day number */}
                <div className="flex justify-end mb-0.5">
                  <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium${isToday ? ' text-white' : ''}`}
                    style={{
                      background: isToday ? '#0284c7' : 'transparent',
                      color: isToday ? '#fff' : !cell.cur ? 'var(--text3)' : isSun ? '#f87171' : isSat ? '#60a5fa' : 'var(--text)',
                    }}>
                    {cell.day}
                  </span>
                </div>

                {/* Tasks */}
                {loading && cell.cur && idx === firstDay && (
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>載入中…</div>
                )}
                {dayTasks.slice(0, 3).map(t => (
                  <div key={t.id}
                    className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer transition hover:opacity-80"
                    style={{
                      background: t.projects?.color ? t.projects.color + '22' : 'var(--bg2)',
                      color:      t.projects?.color || IMP_COLOR[t.importance] || 'var(--text2)',
                      border:     `1px solid ${t.projects?.color ? t.projects.color + '44' : 'var(--border)'}`,
                      textDecoration: t.status === 'done' ? 'line-through' : 'none',
                      opacity: t.status === 'done' ? 0.6 : 1,
                    }}
                    onClick={e => { e.stopPropagation(); onEditTask(t) }}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs px-1" style={{ color: 'var(--text3)' }}>
                    +{dayTasks.length - 3} 筆
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
