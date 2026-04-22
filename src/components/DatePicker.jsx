import { useState, useRef, useEffect } from 'react'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS   = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function DatePicker({ value, onChange }) {
  const today   = toYMD(new Date())
  const initDate = value ? new Date(value + 'T00:00:00') : new Date()
  const [open,  setOpen]  = useState(false)
  const [year,  setYear]  = useState(initDate.getFullYear())
  const [month, setMonth] = useState(initDate.getMonth())
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    }
  }, [value])

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )
  while (cells.length % 7 !== 0) cells.push(null)

  const select = (day) => {
    if (!day) return
    const d = new Date(year, month, day)
    onChange(toYMD(d))
    setOpen(false)
  }

  const quickDates = [
    { label: '今天',  val: toYMD(new Date()) },
    { label: '明天',  val: toYMD(new Date(Date.now() + 86400000)) },
    { label: '後天',  val: toYMD(new Date(Date.now() + 2 * 86400000)) },
  ]
  const sun = new Date(); sun.setDate(sun.getDate() + (7 - sun.getDay()) % 7 || 7)
  quickDates.push({ label: '本週日', val: toYMD(sun) })

  return (
    <div className="relative" ref={ref}>
      {/* Quick shortcuts */}
      <div className="flex gap-1 mb-1.5">
        {quickDates.map(({ label, val }) => (
          <button key={label} type="button"
            onClick={() => onChange(val)}
            className="text-xs px-2 py-1 rounded-md transition hover:opacity-80"
            style={{
              background: value === val ? '#0284c7' : 'var(--bg2)',
              color:      value === val ? '#fff'    : 'var(--text3)',
              border: '1px solid var(--border)',
            }}>
            {label}
          </button>
        ))}
        {value && (
          <button type="button" onClick={() => onChange('')}
            className="text-xs px-2 py-1 rounded-md transition hover:opacity-80 ml-auto"
            style={{ color: 'var(--text3)', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            清除
          </button>
        )}
      </div>

      {/* Input trigger */}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition hover:opacity-80"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: value ? 'var(--text)' : 'var(--text3)' }}>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {value || '選擇日期…'}
      </button>

      {/* Calendar popup */}
      {open && (
        <div className="absolute z-50 mt-1 rounded-xl shadow-2xl p-3 w-64"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:opacity-70"
              style={{ color: 'var(--text3)' }}>‹</button>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {year} 年 {MONTHS[month]}
            </span>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:opacity-70"
              style={{ color: 'var(--text3)' }}>›</button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs py-1" style={{ color: 'var(--text3)' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const ymd = toYMD(new Date(year, month, day))
              const isSelected = ymd === value
              const isToday    = ymd === today
              return (
                <button key={i} type="button" onClick={() => select(day)}
                  className="w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs transition hover:opacity-80"
                  style={{
                    background: isSelected ? '#0284c7' : isToday ? 'var(--bg2)' : 'transparent',
                    color:      isSelected ? '#fff' : isToday ? '#38bdf8' : 'var(--text)',
                    fontWeight: isToday ? 600 : 400,
                  }}>
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
