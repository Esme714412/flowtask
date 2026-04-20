import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import DatePicker from './DatePicker'

const PROJECT_COLORS = ['#38bdf8','#34d399','#a78bfa','#f472b6','#fb923c','#facc15','#94a3b8']

export default function TaskModal({ task, onClose, onSaved, session }) {
  const isEdit = !!task
  const [form, setForm] = useState({
    title:      task?.title      || '',
    project_id: task?.project_id || '',
    due_date:   task?.due_date   || '',
    importance: task?.importance || 3,
    notes:      task?.notes      || '',
  })
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState([])
  const [addingProject, setAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase.from('projects').select('*').eq('user_id', session.user.id).order('name')
      .then(({ data }) => setProjects(data || []))
  }, [session.user.id])

  const createProject = async () => {
    if (!newProjectName.trim()) return
    const { data, error } = await supabase.from('projects').insert({
      user_id: session.user.id,
      name: newProjectName.trim(),
      color: newProjectColor,
    }).select().single()
    if (error) { toast.error('建立失敗'); return }
    setProjects(p => [...p, data])
    set('project_id', data.id)
    setNewProjectName('')
    setAddingProject(false)
    toast.success('專案已建立')
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('請輸入任務名稱'); return }
    setSaving(true)
    const payload = {
      ...form,
      user_id: session.user.id,
      project_id: form.project_id || null,
      due_date:   form.due_date   || null,
    }
    const { error } = isEdit
      ? await supabase.from('tasks').update(payload).eq('id', task.id)
      : await supabase.from('tasks').insert(payload)
    setSaving(false)
    if (error) { toast.error('儲存失敗：' + error.message); return }
    toast.success(isEdit ? '任務已更新' : '任務已建立')
    onSaved?.()
    onClose()
  }

  const selectedProject = projects.find(p => p.id === form.project_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div className="card w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-0 flex-shrink-0">
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{isEdit ? '編輯任務' : '新增任務'}</h2>
          <button onClick={onClose} style={{ color: 'var(--text3)' }} className="hover:opacity-70">✕</button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6 pt-5 flex-1">
          {/* 任務名稱 */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text2)' }}>任務名稱 *</label>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="輸入任務名稱…"
              autoFocus
            />
          </div>

          {/* 專案 */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text2)' }}>專案</label>
            {!addingProject ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    className="w-full py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500 appearance-none"
                    style={{
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      color: form.project_id ? 'var(--text)' : 'var(--text3)',
                      paddingLeft: selectedProject ? '1.75rem' : '0.75rem',
                    }}
                    value={form.project_id}
                    onChange={e => set('project_id', e.target.value)}
                  >
                    <option value="">無專案</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {selectedProject && (
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-2 h-2 rounded-full" style={{ background: selectedProject.color }} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAddingProject(true)}
                  className="px-3 py-2 rounded-lg text-sm transition hover:opacity-80"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)' }}
                  title="新增專案">
                  +
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 px-2 py-1.5 rounded-md text-sm outline-none focus:ring-2 focus:ring-sky-500"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="專案名稱…"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && createProject()}
                  />
                </div>
                <div className="flex gap-1.5 mb-2">
                  {PROJECT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setNewProjectColor(c)}
                      className="w-5 h-5 rounded-full transition"
                      style={{ background: c, outline: newProjectColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAddingProject(false)}
                    className="flex-1 py-1.5 rounded-md text-xs transition hover:opacity-80"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)' }}>
                    取消
                  </button>
                  <button type="button" onClick={createProject}
                    className="flex-1 py-1.5 rounded-md text-xs btn-primary transition">
                    建立
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 截止日期 */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text2)' }}>截止日期</label>
            <DatePicker value={form.due_date} onChange={v => set('due_date', v)} />
          </div>

          {/* 重要度 */}
          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--text2)' }}>
              重要度：<span className="text-sky-400 font-semibold">{form.importance} / 5</span>
            </label>
            <input
              type="range" min={1} max={5} step={1}
              className="w-full accent-sky-500"
              value={form.importance}
              onChange={e => set('importance', Number(e.target.value))}
            />
            <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
              <span>不重要</span><span>非常重要</span>
            </div>
          </div>

          {/* 備註 */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text2)' }}>備註</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="選填備註…"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm transition"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm btn-primary transition disabled:opacity-50">
            {saving ? '儲存中…' : isEdit ? '更新' : '新增'}
          </button>
        </div>
      </div>
    </div>
  )
}
