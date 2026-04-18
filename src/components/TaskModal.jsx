import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{isEdit ? '編輯任務' : '新增任務'}</h2>
          <button onClick={onClose} style={{ color: 'var(--text3)' }} className="hover:opacity-70">✕</button>
        </div>

        <div className="space-y-4">
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

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text2)' }}>截止日期</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
            />
          </div>

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

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm transition"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm text-white bg-sky-600 hover:bg-sky-500 transition disabled:opacity-50">
            {saving ? '儲存中…' : isEdit ? '更新' : '新增'}
          </button>
        </div>
      </div>
    </div>
  )
}
