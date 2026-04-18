import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function RewardsView({ session, profile, onProfileUpdate }) {
  const [rewards,      setRewards]      = useState([])
  const [history,      setHistory]      = useState([])
  const [adding,       setAdding]       = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newCost,      setNewCost]      = useState(50)
  const [tab,          setTab]          = useState('rewards')

  const balance = profile?.xp_balance || 0

  const fetchRewards = useCallback(async () => {
    const { data } = await supabase.from('rewards')
      .select('*').eq('user_id', session.user.id).order('xp_cost')
    setRewards(data || [])
  }, [session.user.id])

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase.from('reward_redemptions')
      .select('*').eq('user_id', session.user.id)
      .order('redeemed_at', { ascending: false }).limit(30)
    setHistory(data || [])
  }, [session.user.id])

  useEffect(() => { fetchRewards() }, [fetchRewards])
  useEffect(() => { if (tab === 'history') fetchHistory() }, [tab, fetchHistory])

  const addReward = async () => {
    if (!newName.trim()) { toast.error('請輸入獎勵名稱'); return }
    if (newCost < 1)     { toast.error('XP 費用至少 1'); return }
    const { error } = await supabase.from('rewards').insert({
      user_id: session.user.id, name: newName.trim(), xp_cost: newCost,
    })
    if (error) { toast.error('新增失敗'); return }
    toast.success('獎勵已新增')
    setNewName(''); setNewCost(50); setAdding(false)
    fetchRewards()
  }

  const deleteReward = async (id) => {
    await supabase.from('rewards').delete().eq('id', id)
    fetchRewards()
  }

  const redeem = async (reward) => {
    if (balance < reward.xp_cost) {
      toast.error(`XP 不足！還需要 ${reward.xp_cost - balance} XP`)
      return
    }
    const newBalance = balance - reward.xp_cost
    const { error } = await supabase.from('profiles').update({
      xp_balance: newBalance,
    }).eq('id', session.user.id)
    if (error) { toast.error('兌換失敗'); return }

    await supabase.from('reward_redemptions').insert({
      user_id: session.user.id,
      reward_id: reward.id,
      reward_name: reward.name,
      xp_spent: reward.xp_cost,
    })

    onProfileUpdate?.({ xp_balance: newBalance })
    toast.success(`🎁 已兌換「${reward.name}」！-${reward.xp_cost} XP`)
    if (tab === 'history') fetchHistory()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>獎勵兌換</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            可用 XP：<span className="text-sky-400 font-bold">{balance}</span>
          </p>
        </div>
        {tab === 'rewards' && (
          <button onClick={() => setAdding(v => !v)}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-lg transition">
            {adding ? '取消' : '+ 新增獎勵'}
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="card p-4 mb-5">
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text2)' }}>獎勵名稱</label>
              <input
                className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="例：看一集劇、買手搖飲…" autoFocus
                onKeyDown={e => e.key === 'Enter' && addReward()}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text2)' }}>
                XP 費用：<span className="text-sky-400 font-semibold">{newCost} XP</span>
              </label>
              <input type="range" min={10} max={500} step={10}
                className="w-full accent-sky-500"
                value={newCost} onChange={e => setNewCost(Number(e.target.value))} />
              <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                <span>10</span><span>500</span>
              </div>
            </div>
            <button onClick={addReward}
              className="w-full py-2 rounded-lg text-sm text-white bg-sky-600 hover:bg-sky-500 transition">
              新增
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg2)' }}>
        {[{ value: 'rewards', label: '我的獎勵' }, { value: 'history', label: '兌換紀錄' }].map(t => (
          <button key={t.value} className={`tab-pill flex-1${tab === t.value ? ' active' : ''}`}
            onClick={() => setTab(t.value)}>{t.label}</button>
        ))}
      </div>

      {tab === 'rewards' && (
        rewards.length === 0 ? (
          <div className="card p-10 text-center" style={{ color: 'var(--text3)' }}>
            <div className="text-4xl mb-3">🎁</div>
            <div>還沒有獎勵，新增一個犒賞自己吧！</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rewards.map(r => (
              <div key={r.id} className="card p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{r.name}</div>
                  <div className="text-xs mt-0.5 text-sky-400">{r.xp_cost} XP</div>
                </div>
                <button
                  onClick={() => redeem(r)}
                  disabled={balance < r.xp_cost}
                  className="px-4 py-1.5 rounded-lg text-sm text-white transition"
                  style={{ background: balance >= r.xp_cost ? '#0284c7' : 'var(--surface)', color: balance >= r.xp_cost ? '#fff' : 'var(--text3)', cursor: balance >= r.xp_cost ? 'pointer' : 'not-allowed' }}>
                  兌換
                </button>
                <button onClick={() => deleteReward(r.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition hover:opacity-70"
                  style={{ color: 'var(--text3)' }}>✕</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'history' && (
        history.length === 0 ? (
          <div className="card p-10 text-center" style={{ color: 'var(--text3)' }}>
            <div className="text-4xl mb-3">📋</div>
            <div>還沒有兌換紀錄</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map(h => (
              <div key={h.id} className="task-row flex items-center gap-3">
                <span className="text-lg">🎁</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{h.reward_name}</div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>
                    {new Date(h.redeemed_at).toLocaleDateString('zh-TW')}
                  </div>
                </div>
                <span className="text-sm text-red-400">-{h.xp_spent} XP</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
