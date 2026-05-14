import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtD = d => { if (!d) return ''; const [,m,dd] = d.split('-'); return `${MONTHS[+m-1]} ${+dd}` }
const today = () => new Date().toISOString().slice(0, 10)

function MiniLine({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={44}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e7f0', borderRadius: 8, fontSize: 11 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function Dashboard({ user, setTab }) {
  const [weight, setWeight] = useState([])
  const [mood, setMood] = useState([])
  const [sleep, setSleep] = useState([])
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState([])
  const [todos, setTodos] = useState([])
  const [fitness, setFitness] = useState([])

  useEffect(() => {
    const uid = user.id
    const load = async () => {
      const [w, mo, sl, hb, hl, ac, ba, td, fi] = await Promise.all([
        supabase.from('weight_entries').select('*').eq('user_id', uid).order('date'),
        supabase.from('mood_entries').select('*').eq('user_id', uid).order('date'),
        supabase.from('sleep_entries').select('*').eq('user_id', uid).order('date'),
        supabase.from('habits').select('*').eq('user_id', uid),
        supabase.from('habit_logs').select('*, habits!inner(user_id)').eq('habits.user_id', uid),
        supabase.from('bank_accounts').select('*').eq('user_id', uid),
        supabase.from('balance_entries').select('*, bank_accounts!inner(user_id)').eq('bank_accounts.user_id', uid).order('date'),
        supabase.from('todos').select('*').eq('user_id', uid).eq('done', false).order('created_at', { ascending: false }),
        supabase.from('fitness_entries').select('*').eq('user_id', uid).order('date', { ascending: false }),
      ])
      if (w.data) setWeight(w.data)
      if (mo.data) setMood(mo.data)
      if (sl.data) setSleep(sl.data)
      if (hb.data) setHabits(hb.data)
      if (hl.data) setHabitLogs(hl.data)
      if (ac.data) setAccounts(ac.data)
      if (ba.data) setBalances(ba.data)
      if (td.data) setTodos(td.data)
      if (fi.data) setFitness(fi.data)
    }
    load()
  }, [user])

  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'there'
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Weight stats
  const latestW = weight[weight.length - 1]
  const prevW = weight[weight.length - 2]
  const wDiff = latestW && prevW ? (latestW.weight - prevW.weight).toFixed(1) : null
  const wChart = weight.slice(-14).map(w => ({ v: w.weight }))

  // Mood - last 7 days avg
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const recentMood = mood.filter(m => new Date(m.date) >= sevenDaysAgo)
  const avgMood = recentMood.length ? (recentMood.reduce((s, m) => s + m.score, 0) / recentMood.length).toFixed(1) : null
  const EMOJIS = ['😞', '😕', '😐', '🙂', '😊']
  const moodChart = mood.slice(-14).map(m => ({ v: m.score }))

  // Sleep - last 7 days
  const calcHours = (sl, wk) => {
    const [sh, sm] = sl.split(':').map(Number)
    const [wh, wm] = wk.split(':').map(Number)
    let mins = (wh * 60 + wm) - (sh * 60 + sm)
    if (mins < 0) mins += 1440
    return +(mins / 60).toFixed(1)
  }
  const recentSleep = sleep.slice(-7).map(s => ({ v: calcHours(s.sleep_time, s.wake_time) }))
  const avgSleep = recentSleep.length ? (recentSleep.reduce((s, r) => s + r.v, 0) / recentSleep.length).toFixed(1) : null

  // Habits - today's status + streak
  const getStreak = (hid) => {
    const logs = habitLogs.filter(l => l.habit_id === hid).map(l => l.date).sort()
    let streak = 0
    const d = new Date()
    while (true) {
      const k = d.toISOString().slice(0, 10)
      if (logs.includes(k)) { streak++; d.setDate(d.getDate() - 1) } else break
    }
    return streak
  }
  const isCheckedToday = (hid) => habitLogs.some(l => l.habit_id === hid && l.date === today())

  // Finance - latest balance per account
  const getLatestBalance = (aid) => {
    const entries = balances.filter(b => b.account_id === aid).sort((a, b) => b.date.localeCompare(a.date))
    return entries[0]?.balance ?? null
  }
  const totalBalance = accounts.reduce((s, a) => {
    const b = getLatestBalance(a.id)
    return s + (b || 0)
  }, 0)

  // Fitness this week
  const wkStart = new Date(); wkStart.setDate(wkStart.getDate() - 6)
  const wkFitness = fitness.filter(f => new Date(f.date) >= wkStart)
  const lastFit = fitness[0]

  return (
    <div>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderRadius: 16, padding: '22px 26px', marginBottom: 18, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{greeting}, {name}! 👋</div>
        <div style={{ opacity: .8, fontSize: 14 }}>{DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}</div>
        {habits.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {habits.slice(0, 4).map(h => (
              <div key={h.id} style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '4px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: isCheckedToday(h.id) ? '#6ee7b7' : 'rgba(255,255,255,.5)' }}>
                  {isCheckedToday(h.id) ? '✓' : '○'}
                </span>
                {h.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP CHARTS ROW */}
      <div className="grid-3" style={{ marginBottom: 14 }}>
        {/* Weight */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('weight')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-muted text-sm mb-1">Current Weight</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace,Calibri' }}>
                {latestW ? `${latestW.weight} kg` : '—'}
              </div>
              {latestW?.body_fat && <div className="text-muted text-sm mt-1">Body fat: {latestW.body_fat}%</div>}
              {wDiff !== null && (
                <div style={{ fontSize: 12, marginTop: 3, color: +wDiff <= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                  {+wDiff <= 0 ? '↓' : '↑'} {Math.abs(wDiff)} kg since last entry
                </div>
              )}
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(79,70,229,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontSize: 14 }}>
              <i className="ti ti-activity" />
            </div>
          </div>
          {wChart.length > 1 && <div style={{ marginTop: 8 }}><MiniLine data={wChart} color="#4f46e5" /></div>}
        </div>

        {/* Sleep */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('sleep')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-muted text-sm mb-1">Avg Sleep (7d)</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace,Calibri' }}>
                {avgSleep ? `${avgSleep}h` : '—'}
              </div>
              {sleep.length > 0 && (
                <div className="text-muted text-sm mt-1">
                  Last: {calcHours(sleep[sleep.length-1].sleep_time, sleep[sleep.length-1].wake_time)}h · {fmtD(sleep[sleep.length-1].date)}
                </div>
              )}
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(37,99,235,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: 14 }}>
              <i className="ti ti-moon" />
            </div>
          </div>
          {recentSleep.length > 1 && <div style={{ marginTop: 8 }}><MiniLine data={recentSleep} color="#2563eb" /></div>}
        </div>

        {/* Mood */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('mood')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-muted text-sm mb-1">Avg Mood (7d)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 28 }}>{avgMood ? EMOJIS[Math.round(+avgMood) - 1] : '—'}</span>
                {avgMood && <span style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{avgMood}/5</span>}
              </div>
              <div className="text-muted text-sm mt-1">{recentMood.length} entries this week</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', fontSize: 14 }}>
              <i className="ti ti-heart" />
            </div>
          </div>
          {moodChart.length > 1 && <div style={{ marginTop: 8 }}><MiniLine data={moodChart} color="#7c3aed" /></div>}
        </div>
      </div>

      {/* HABITS + FINANCE */}
      <div className="grid-2" style={{ marginBottom: 14 }}>
        {/* Habits */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('habits')}>
          <div className="card-title">Today's Habits</div>
          {habits.length === 0
            ? <div className="empty" style={{ padding: '12px 0' }}>No habits yet</div>
            : habits.map(h => {
              const checked = isCheckedToday(h.id)
              const streak = getStreak(h.id)
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: checked ? 'var(--t)' : 'var(--m)' }}>{h.name}</span>
                  <span style={{ fontFamily: 'monospace,Calibri', fontSize: 18, fontWeight: 700, color: h.color, minWidth: 36, textAlign: 'right' }}>{streak}</span>
                  <span style={{ fontSize: 11, color: 'var(--m)' }}>days</span>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: checked ? h.color : 'var(--s2)', border: `1.5px solid ${checked ? h.color : 'var(--b)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, flexShrink: 0 }}>
                    {checked && <i className="ti ti-check" />}
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* Finance */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('finance')}>
          <div className="card-title">Finances</div>
          {accounts.length === 0
            ? <div className="empty" style={{ padding: '12px 0' }}>No accounts yet</div>
            : <>
              {accounts.map(a => {
                const bal = getLatestBalance(a.id)
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--b)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(5,150,105,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontSize: 13, marginRight: 10, flexShrink: 0 }}>
                      <i className="ti ti-building-bank" />
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{a.name}</span>
                    <span style={{ fontFamily: 'monospace,Calibri', fontWeight: 700, fontSize: 15, color: bal !== null ? '#059669' : 'var(--m)' }}>
                      {bal !== null ? `¥${Number(bal).toLocaleString()}` : '—'}
                    </span>
                  </div>
                )
              })}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-sm">Total across all accounts</span>
                <span style={{ fontFamily: 'monospace,Calibri', fontWeight: 700, fontSize: 16, color: '#059669' }}>¥{totalBalance.toLocaleString()}</span>
              </div>
            </>
          }
        </div>
      </div>

      {/* TODOS + FITNESS */}
      <div className="grid-2">
        {/* Pending Todos */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('todos')}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Pending To-Dos</span>
            <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{todos.length}</span>
          </div>
          {todos.length === 0
            ? <div className="empty" style={{ padding: '12px 0' }}>All caught up! 🎉</div>
            : todos.slice(0, 5).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--b)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--b)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14 }}>{t.text}</span>
                {t.category && <span className="badge badge-muted">{t.category}</span>}
              </div>
            ))
          }
          {todos.length > 5 && <div className="text-muted text-sm" style={{ marginTop: 8 }}>+{todos.length - 5} more tasks</div>}
        </div>

        {/* Recent Fitness */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('fitness')}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Fitness</span>
            <span style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{wkFitness.length} this week</span>
          </div>
          {lastFit
            ? <>
              <div style={{ marginBottom: 10 }}>
                <div className="text-muted text-sm mb-1">Last session</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{lastFit.exercise}</div>
                <div className="text-muted text-sm mt-1">
                  {[lastFit.sets && lastFit.reps && `${lastFit.sets}×${lastFit.reps}`, lastFit.duration && `${lastFit.duration}min`, lastFit.distance && `${lastFit.distance}km`].filter(Boolean).join(' · ')} · {fmtD(lastFit.date)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - 6 + i)
                  const dk = d.toISOString().slice(0, 10)
                  const has = fitness.some(f => f.date === dk)
                  return (
                    <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: has ? '#7c3aed' : 'var(--b)' }} title={DAYS[d.getDay()]} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - 6 + i)
                  return <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--m)' }}>{DAYS[d.getDay()][0]}</div>
                })}
              </div>
            </>
            : <div className="empty" style={{ padding: '12px 0' }}>No workouts yet 💪</div>
          }
        </div>
      </div>
    </div>
  )
}
