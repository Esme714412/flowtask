import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const QUADRANTS = [
  { key: 'q1', label: '立即處理', sub: '重要 · 緊急',     color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  { key: 'q2', label: '計劃執行', sub: '重要 · 不緊急',   color: '#34d399', bg: 'rgba(52,211,153,0.08)'  },
  { key: 'q3', label: '委派他人', sub: '不重要 · 緊急',   color: '#fbbf24', bg: 'rgba(251,191,36,0.08)'  },
  { key: 'q4', label: '考慮刪除', sub: '不重要 · 不緊急', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
]

function classify(task, today, urgentDate) {
  const important = task.importance >= 4
  const urgent    = task.due_date && task.due_date <= urgentDate
  if (important && urgent)  return 'q1'
  if (important && !urgent) return 'q2'
  if (!important && urgent) return 'q3'
  return 'q4'
}

export default function MatrixView({ session, onEditTask, taskVersion }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const today     = new Date().toISOString().split('T')[0]
  const urgentDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*, projects(name, color)')
      .eq('user_id', session.user.id)
      .eq('status', 'todo')
      .order('importance', { ascending: false })
      .order('due_date',   { ascending: true, nullsFirst: false })
    setTasks(data || [])
    setLoading(false)
  }, [session.user.id])

  useEffect(() => { fetchTasks() }, [fetchTasks, taskVersion])

  const grouped = { q1: [], q2: [], q3: [], q4: [] }
  tasks.forEach(t => grouped[classify(t, today, urgentDate)].push(t))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>艾森豪矩陣</h1>
        <div className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--text3)', background: 'var(--bg2)' }}>
          重要 = 高/最高優先級 · 緊急 = 3 天內到期
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center" style={{ color: 'var(--text3)' }}>載入中…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {QUADRANTS.map(q => (
            <div key={q.key} className="card p-4" style={{ background: q.bg, border: `1px solid ${q.color}30` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: q.color }} />
                <div>
                  <span className="text-sm font-semibold" style={{ color: q.color }}>{q.label}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text3)' }}>{q.sub}</span>
                </div>
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: q.color + '22', color: q.color }}>
                  {grouped[q.key].length}
                </span>
              </div>

              <div className="flex flex-col gap-2" style={{ minHeight: 80 }}>
                {grouped[q.key].length === 0 ? (
                  <div className="text-xs text-center py-4" style={{ color: 'var(--text3)' }}>沒有任務</div>
                ) : (
                  grouped[q.key].map(task => (
                    <TaskChip key={task.id} task={task} today={today} color={q.color} onClick={() => onEditTask?.(task)} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskChip({ task, today, color, onClick }) {
  const isOverdue = task.due_date && task.due_date < today
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition hover:opacity-80"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate" style={{ color: 'var(--text)' }}>{task.title}</div>
        {task.due_date && (
          <div className="text-xs" style={{ color: isOverdue ? '#f87171' : 'var(--text3)' }}>
            {isOverdue ? '逾期 ' : ''}{task.due_date}
          </div>
        )}
      </div>
      {task.projects && (
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: task.projects.color }} />
      )}
    </div>
  )
}
