import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const IMP_COLOR  = ['', 'bg-slate-400', 'bg-blue-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500']
const IMP_LABEL  = ['', '最低', '低', '中', '高', '最高']
const STATUS_TAB = [
  { value: 'todo',      label: '待辦' },
  { value: 'done',      label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export default function TaskList({ onNewTask, onEditTask, session, profile, onProfileUpdate, taskVersion }) {
  const [tasks,    setTasks]    = useState([])
  const [status,   setStatus]   = useState('todo')
  const [loading,  setLoading]  = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*, projects(name, color)')
      .eq('user_id', session.user.id)
      .eq('status', status)
      .order('importance', { ascending: false })
      .order('due_date',   { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }, [session.user.id, status])

  useEffect(() => { fetchTasks() }, [fetchTasks, taskVersion])

  const completeTask = async (task) => {
    const xpGain = task.importance * 10
    const now    = new Date().toISOString()

    await supabase.from('tasks').update({
      status: 'done', completed_at: now, xp_earned: xpGain,
    }).eq('id', task.id)

    const newXp    = (profile?.xp || 0) + xpGain
    const newLevel = Math.floor(newXp / 500) + 1
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const lastDate  = profile?.last_active_date
    const newStreak = lastDate === yesterday
      ? (profile?.streak || 0) + 1
      : lastDate === today ? (profile?.streak || 1) : 1

    const newBalance = (profile?.xp_balance || 0) + xpGain
    await supabase.from('profiles').upsert({
      id: session.user.id, xp: newXp, level: newLevel,
      xp_balance: newBalance, streak: newStreak, last_active_date: today,
    }, { onConflict: 'id' })

    onProfileUpdate?.({ xp: newXp, level: newLevel, xp_balance: newBalance, streak: newStreak, last_active_date: today })

    const { data: ds } = await supabase.from('daily_stats')
      .select('*').eq('user_id', session.user.id).eq('date', today).single()
    if (ds) {
      await supabase.from('daily_stats').update({
        tasks_completed: ds.tasks_completed + 1, xp_earned: ds.xp_earned + xpGain,
      }).eq('id', ds.id)
    } else {
      await supabase.from('daily_stats').insert({
        user_id: session.user.id, date: today, tasks_completed: 1, xp_earned: xpGain,
      })
    }

    toast.success(`✓ 完成！+${xpGain} XP`)
    fetchTasks()
  }

  const cancelTask = async (task) => {
    await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', task.id)
    toast.success('已取消任務')
    fetchTasks()
  }

  const restoreTask = async (task) => {
    await supabase.from('tasks').update({ status: 'todo', completed_at: null, xp_earned: 0 }).eq('id', task.id)
    toast.success('已恢復為待辦')
    fetchTasks()
  }

  const deleteTask = async (task) => {
    await supabase.from('tasks').delete().eq('id', task.id)
    toast.success('已刪除')
    fetchTasks()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>任務清單</h1>
        <button onClick={() => onNewTask()}
          className="flex items-center gap-2 btn-primary text-sm px-4 py-2 rounded-lg transition">
          + 新增任務
        </button>
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg2)' }}>
        {STATUS_TAB.map(t => (
          <button key={t.value}
            className={`tab-pill flex-1${status === t.value ? ' active' : ''}`}
            onClick={() => setStatus(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center" style={{ color: 'var(--text3)' }}>載入中…</div>
      ) : tasks.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'var(--text3)' }}>
          <div className="text-3xl mb-2">{status === 'done' ? '🎉' : status === 'cancelled' ? '🗑️' : '📋'}</div>
          <div>{status === 'done' ? '還沒有完成的任務' : status === 'cancelled' ? '沒有取消的任務' : '沒有待辦任務'}</div>
          {status === 'todo' && (
            <button onClick={() => onNewTask()} className="mt-4 text-sm text-sky-400 hover:underline">新增第一個任務</button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              status={status}
              onEdit={onEditTask}
              onComplete={completeTask}
              onCancel={cancelTask}
              onRestore={restoreTask}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, today, status, onEdit, onComplete, onCancel, onRestore, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isOverdue = task.due_date && task.due_date < today && status === 'todo'

  return (
    <div className="task-row flex items-center gap-3 relative"
      onClick={() => status === 'todo' && onEdit(task)}
      style={{ cursor: status === 'todo' ? 'pointer' : 'default' }}>

      {status === 'todo' ? (
        <button
          className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition hover:bg-sky-500 hover:border-sky-500"
          style={{ borderColor: 'var(--border)' }}
          onClick={e => { e.stopPropagation(); onComplete(task) }}
        />
      ) : status === 'done' ? (
        <div className="w-5 h-5 rounded-full bg-sky-500 flex-shrink-0 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text3)' }}>✕</span>
        </div>
      )}

      <div className={`w-1 h-8 rounded-full flex-shrink-0 ${IMP_COLOR[task.importance]}`}
        style={{ opacity: status !== 'todo' ? 0.4 : 1 }} />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate"
          style={{ color: 'var(--text)', textDecoration: status !== 'todo' ? 'line-through' : 'none', opacity: status !== 'todo' ? 0.6 : 1 }}>
          {task.title}
        </div>
        <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
          {task.projects && <span style={{ color: task.projects.color }}>{task.projects.name}</span>}
          <span>{IMP_LABEL[task.importance]}</span>
          {task.due_date && (
            <span className={isOverdue ? 'text-red-400' : ''}>
              {isOverdue ? '逾期 ' : ''}{task.due_date}
            </span>
          )}
          {status === 'done' && task.xp_earned > 0 && (
            <span className="text-sky-400">+{task.xp_earned} XP</span>
          )}
        </div>
      </div>

      <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:opacity-70"
          style={{ color: 'var(--text3)' }}
          onClick={() => setMenuOpen(v => !v)}>
          ⋯
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-20 rounded-xl shadow-xl py-1 min-w-28"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {status === 'todo' && <>
                <MenuItem onClick={() => { onEdit(task); setMenuOpen(false) }}>編輯</MenuItem>
                <MenuItem onClick={() => { onComplete(task); setMenuOpen(false) }}>標記完成</MenuItem>
                <MenuItem onClick={() => { onCancel(task); setMenuOpen(false) }}>取消任務</MenuItem>
              </>}
              {(status === 'done' || status === 'cancelled') && (
                <MenuItem onClick={() => { onRestore(task); setMenuOpen(false) }}>恢復待辦</MenuItem>
              )}
              <MenuItem danger onClick={() => { onDelete(task); setMenuOpen(false) }}>刪除</MenuItem>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MenuItem({ onClick, danger, children }) {
  return (
    <button
      className="w-full text-left px-4 py-2 text-sm transition hover:opacity-80"
      style={{ color: danger ? '#f87171' : 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer' }}
      onClick={onClick}>
      {children}
    </button>
  )
}
