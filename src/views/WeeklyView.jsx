import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六']

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday, mondayYMD: toYMD(monday), sundayYMD: toYMD(sunday) }
}


export default function WeeklyView({ session, taskVersion }) {
  const [tasks, setTasks] = useState([])
  const [aiSummary, setAiSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  const { monday, sunday, mondayYMD, sundayYMD } = getWeekRange(weekOffset)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: taskData }, { data: summaryData }] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, projects(id, name, color)')
        .eq('user_id', session.user.id)
        .gte('due_date', mondayYMD)
        .lte('due_date', sundayYMD)
        .order('due_date', { ascending: true }),
      supabase
        .from('weekly_summaries')
        .select('summary, created_at')
        .eq('user_id', session.user.id)
        .eq('week_start', mondayYMD)
        .single(),
    ])
    setTasks(taskData || [])
    setAiSummary(summaryData?.summary ?? null)
    setLoading(false)
  }, [session.user.id, mondayYMD, sundayYMD])

  useEffect(() => { fetchData() }, [fetchData, taskVersion, weekOffset])

  const doneCount = tasks.filter(t => t.status === 'done').length
  const todoCount = tasks.filter(t => t.status === 'todo').length
  const total = tasks.length
  const rate = total ? Math.round((doneCount / total) * 100) : 0

  // Group by project, sorted by task count desc
  const byProject = {}
  for (const task of tasks) {
    const key = task.project_id || '__none__'
    if (!byProject[key]) byProject[key] = { project: task.projects, list: [] }
    byProject[key].list.push(task)
  }
  const projectGroups = Object.entries(byProject).sort(([, a], [, b]) => b.list.length - a.list.length)

  const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS_SHORT[d.getDay()]})`
  const weekLabel = `${fmt(monday)} – ${fmt(sunday)}`

  if (loading) {
    return <div className="card p-8 text-center" style={{ color: 'var(--text2)' }}>載入中…</div>
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>週報</h1>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:opacity-70"
            style={{ color: 'var(--text3)', background: 'var(--bg2)', border: '1px solid var(--border)' }}>‹</button>
          <span className="text-sm px-2 py-0.5 rounded-md min-w-36 text-center"
            style={{ color: weekOffset === 0 ? '#0284c7' : 'var(--text3)', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            {weekOffset === 0 ? '本週　' : ''}{weekLabel}
          </span>
          <button onClick={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:opacity-70 disabled:opacity-30"
            style={{ color: 'var(--text3)', background: 'var(--bg2)', border: '1px solid var(--border)' }}>›</button>
        </div>
      </div>

      {/* 本週完成統計 */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text2)' }}>本週任務概況</h2>
        {total === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text3)' }}>本週沒有安排任務</p>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold" style={{ color: '#0284c7' }}>{doneCount}</span>
              <span className="text-lg mb-0.5" style={{ color: 'var(--text3)' }}>/ {total}</span>
              <span className="text-sm mb-1 ml-1" style={{ color: 'var(--text2)' }}>個任務完成</span>
              <span className="ml-auto text-2xl font-bold"
                style={{ color: rate === 100 ? '#16a34a' : 'var(--text)' }}>
                {rate}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--prog-bg)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${rate}%`, background: rate === 100 ? '#16a34a' : '#0284c7' }} />
            </div>
            <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text3)' }}>
              <span>已完成 {doneCount} 個</span>
              <span>未完成 {todoCount} 個</span>
            </div>
          </>
        )}
      </div>

      {/* AI 週報總結 */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text2)' }}>AI 週報總結</h2>
        {aiSummary ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text3)' }}>本週貢獻</p>
              <p className="text-sm" style={{ color: 'var(--text2)' }}>{aiSummary.contribution}</p>
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }} />
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text3)' }}>推動專案進展</p>
              <p className="text-sm" style={{ color: 'var(--text2)' }}>{aiSummary.project_progress}</p>
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }} />
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text3)' }}>建議與點評</p>
              <ul className="space-y-1.5">
                {(aiSummary.suggestions || []).map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text2)' }}>
                    <span style={{ color: '#0284c7', flexShrink: 0 }}>·</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text3)' }}>
            每週日 22:00 自動產生，尚未生成
          </p>
        )}
      </div>

      {/* 各專案進度 */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text2)' }}>各專案進度</h2>
        {projectGroups.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text3)' }}>本週沒有安排任務</p>
        ) : (
          <div className="space-y-5">
            {projectGroups.map(([key, { project, list }]) => {
              const pDone = list.filter(t => t.status === 'done').length
              const pTodo = list.filter(t => t.status === 'todo').length
              const pTotal = list.length
              const pRate = pTotal ? Math.round((pDone / pTotal) * 100) : 0
              const color = project?.color || '#94a3b8'
              const name = project?.name || '未分類'
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{name}</span>
                    </div>
                    <span className="text-xs">
                      <span style={{ color: 'var(--text3)' }}>{pDone} / {pTotal} 個　</span>
                      <span className="font-semibold"
                        style={{ color: pRate === 100 ? '#16a34a' : 'var(--text2)' }}>
                        {pRate}%
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--prog-bg)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pRate}%`, background: color }} />
                  </div>
                  <div className="space-y-1">
                    {list.map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-xs px-1">
                        <span style={{ color: task.status === 'done' ? '#16a34a' : 'var(--text3)' }}>
                          {task.status === 'done' ? '✓' : '○'}
                        </span>
                        <span style={{
                          color: task.status === 'done' ? 'var(--text3)' : 'var(--text2)',
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}>
                          {task.title}
                        </span>
                        {task.due_date && (
                          <span className="ml-auto flex-shrink-0" style={{ color: 'var(--text3)' }}>
                            {task.due_date.slice(5)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
