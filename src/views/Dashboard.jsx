import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const XP_PER_LEVEL = 500
const calcLevel = (xp) => Math.floor((xp || 0) / XP_PER_LEVEL) + 1
const xpInLevel = (xp) => (xp || 0) % XP_PER_LEVEL
const xpProgress = (xp) => (((xp || 0) % XP_PER_LEVEL) / XP_PER_LEVEL) * 100

function greet() {
  const h = new Date().getHours()
  if (h < 12) return '早安'
  if (h < 18) return '午安'
  return '晚安'
}

const IMP_COLOR = ['', 'bg-slate-400', 'bg-blue-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500']

export default function Dashboard({ onNewTask, onEditTask, session, profile, onProfileUpdate, taskVersion }) {
  const [tasks, setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*, projects(name, color)')
      .eq('user_id', session.user.id)
      .eq('status', 'todo')
      .order('importance', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
    setTasks(data || [])
    setLoading(false)
  }, [session.user.id])

  useEffect(() => { fetchTasks() }, [fetchTasks, taskVersion])

  const completeTask = async (task) => {
    const xpGain = task.importance * 10
    const now = new Date().toISOString()

    await supabase.from('tasks').update({
      status: 'done', completed_at: now, xp_earned: xpGain,
    }).eq('id', task.id)

    const newXp   = (profile?.xp || 0) + xpGain
    const newLevel = calcLevel(newXp)
    const lastDate = profile?.last_active_date
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = lastDate === yesterday
      ? (profile?.streak || 0) + 1
      : lastDate === today
        ? (profile?.streak || 1)
        : 1

    const newBalance = (profile?.xp_balance || 0) + xpGain
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: session.user.id, xp: newXp, level: newLevel,
      xp_balance: newBalance, streak: newStreak, last_active_date: today,
    }, { onConflict: 'id' })
    if (profileErr) { toast.error('XP 更新失敗：' + profileErr.message); return }

    onProfileUpdate?.({ xp: newXp, level: newLevel, xp_balance: newBalance, streak: newStreak, last_active_date: today })

    const { data: ds } = await supabase.from('daily_stats')
      .select('*').eq('user_id', session.user.id).eq('date', today).single()
    if (ds) {
      await supabase.from('daily_stats').update({
        tasks_completed: ds.tasks_completed + 1,
        xp_earned: ds.xp_earned + xpGain,
      }).eq('id', ds.id)
    } else {
      await supabase.from('daily_stats').insert({
        user_id: session.user.id, date: today,
        tasks_completed: 1, xp_earned: xpGain,
      })
    }

    toast.success(`✓ 完成！+${xpGain} XP`)
    fetchTasks()
  }

  const todayTasks    = tasks.filter(t => t.due_date && t.due_date <= today)
  const upcomingTasks = tasks.filter(t => !t.due_date || t.due_date > today)
  const lv = calcLevel(profile?.xp)
  const prog = xpProgress(profile?.xp)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{greet()} 👋</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            今天有 <span className="text-sky-400 font-semibold">{todayTasks.length} 件</span>任務待完成
          </p>
        </div>
        <button onClick={onNewTask}
          className="flex items-center gap-2 btn-primary text-sm px-4 py-2 rounded-lg transition">
          + 新增任務
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-sky-400">Lv.{lv}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>等級</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-violet-400">{profile?.xp || 0}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>總 XP</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{profile?.streak || 0}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>連續天數 🔥</div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text2)' }}>
          <span>Lv.{lv} 進度</span>
          <span>{xpInLevel(profile?.xp)} / {XP_PER_LEVEL} XP → Lv.{lv + 1}</span>
        </div>
        <div className="prog-bar">
          <div className="prog-fill bg-sky-400 xp-glow" style={{ width: `${prog}%`, transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center" style={{ color: 'var(--text3)' }}>載入中…</div>
      ) : tasks.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'var(--text3)' }}>
          <div className="text-4xl mb-3">🎉</div>
          <div className="font-medium">沒有待辦任務！</div>
          <button onClick={onNewTask} className="mt-4 text-sm text-sky-400 hover:underline">新增第一個任務</button>
        </div>
      ) : (
        <>
          {todayTasks.length > 0 && (
            <section className="mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>今日 / 逾期</h2>
              <div className="flex flex-col gap-2">
                {todayTasks.map(t => (
                  <TaskRow key={t.id} task={t} today={today} onComplete={completeTask} onEdit={onEditTask} />
                ))}
              </div>
            </section>
          )}
          {upcomingTasks.length > 0 && (
            <section className="mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>即將到來</h2>
              <div className="flex flex-col gap-2">
                {upcomingTasks.slice(0, 8).map(t => (
                  <TaskRow key={t.id} task={t} today={today} onComplete={completeTask} onEdit={onEditTask} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function TaskRow({ task, today, onComplete, onEdit }) {
  const isOverdue = task.due_date && task.due_date < today
  return (
    <div className="task-row flex items-center gap-3" onClick={() => onEdit(task)} style={{ cursor: 'pointer' }}>
      <button
        className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition hover:bg-sky-500 hover:border-sky-500"
        style={{ borderColor: 'var(--border)' }}
        onClick={e => { e.stopPropagation(); onComplete(task) }}
      />
      <div className={`w-1 h-8 rounded-full flex-shrink-0 ${IMP_COLOR[task.importance]}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{task.title}</div>
        {task.projects && (
          <div className="text-xs truncate" style={{ color: 'var(--text3)' }}>{task.projects.name}</div>
        )}
      </div>
      {task.due_date && (
        <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-red-400' : ''}`}
          style={{ color: isOverdue ? '' : 'var(--text3)' }}>
          {isOverdue ? '逾期 ' : ''}{task.due_date}
        </span>
      )}
      <span className="text-xs text-sky-400 flex-shrink-0">+{task.importance * 10} XP</span>
    </div>
  )
}
