import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const GROQ_API_KEY      = process.env.GROQ_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GROQ_API_KEY) {
  console.error('Missing required env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getCurrentWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { mondayYMD: toYMD(monday), sundayYMD: toYMD(sunday) }
}

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Groq API error')
  return data.choices[0].message.content
}

async function generateForUser(userId, mondayYMD, sundayYMD) {
  // Skip if already generated this week
  const { data: existing } = await supabase
    .from('weekly_summaries')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', mondayYMD)
    .single()
  if (existing) {
    console.log(`  [skip] ${userId} — already generated`)
    return
  }

  // Fetch tasks for the week
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, status, importance, due_date, xp_earned, projects(name)')
    .eq('user_id', userId)
    .gte('due_date', mondayYMD)
    .lte('due_date', sundayYMD)
  if (!tasks || tasks.length === 0) {
    console.log(`  [skip] ${userId} — no tasks this week`)
    return
  }

  const done = tasks.filter(t => t.status === 'done')
  const todo = tasks.filter(t => t.status === 'todo')
  const rate = Math.round((done.length / tasks.length) * 100)

  // Group by project
  const byProject = {}
  for (const t of tasks) {
    const name = t.projects?.name || '未分類'
    if (!byProject[name]) byProject[name] = { done: 0, total: 0 }
    byProject[name].total++
    if (t.status === 'done') byProject[name].done++
  }
  const projectLines = Object.entries(byProject)
    .map(([name, s]) => `${name}：${s.done}/${s.total} 完成（${Math.round(s.done / s.total * 100)}%）`)
    .join('\n')

  const highImpTodo = todo.filter(t => t.importance >= 4)

  const prompt = `你是一位生產力顧問，分析用戶本週任務執行情況，幫助他「事半功倍」。

本週（${mondayYMD} ~ ${sundayYMD}）：
- 共 ${tasks.length} 個任務，完成 ${done.length} 個（${rate}%）
- 未完成 ${todo.length} 個，其中高優先（重要度4-5）${highImpTodo.length} 個

各專案進展：
${projectLines}

完成的任務：
${done.map(t => `- [重要度${t.importance}] ${t.title}`).join('\n') || '（無）'}

未完成的任務：
${todo.map(t => `- [重要度${t.importance}] ${t.title}（截止：${t.due_date}）`).join('\n') || '（無）'}

請以 JSON 格式回覆（繁體中文，語氣直接有建設性）：
{
  "contribution": "1-2句，點出本週最有價值的貢獻與實際影響",
  "project_progress": "1-2句，哪個專案推進最多、哪個停滯及可能原因",
  "suggestions": [
    "針對效率的具體可操作建議（非空泛鼓勵）",
    "針對優先順序或任務規劃的建議",
    "若有明顯模式才加第3條，否則省略"
  ]
}

重點：建議要具體說明「如何調整工作方式」，而非只是鼓勵完成更多任務。`

  const raw = await callGroq(prompt)
  let summary
  try {
    summary = JSON.parse(raw)
    if (!Array.isArray(summary.suggestions)) summary.suggestions = []
    summary.suggestions = summary.suggestions.filter(Boolean).slice(0, 3)
  } catch {
    console.error(`  [error] ${userId} — JSON parse failed:`, raw)
    return
  }

  const { error } = await supabase.from('weekly_summaries').insert({
    user_id: userId,
    week_start: mondayYMD,
    summary,
  })
  if (error) console.error(`  [error] ${userId} — insert failed:`, error.message)
  else console.log(`  [done] ${userId} — summary saved`)
}

async function main() {
  const { mondayYMD, sundayYMD } = getCurrentWeekRange()
  console.log(`Generating summaries for ${mondayYMD} ~ ${sundayYMD}`)

  const { data: profiles, error } = await supabase.from('profiles').select('id')
  if (error || !profiles) { console.error('Failed to fetch profiles:', error?.message); process.exit(1) }

  console.log(`Found ${profiles.length} users`)
  for (const { id } of profiles) {
    console.log(`Processing ${id}`)
    await generateForUser(id, mondayYMD, sundayYMD)
  }
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
