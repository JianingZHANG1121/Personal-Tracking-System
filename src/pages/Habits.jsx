import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const today = () => new Date().toISOString().slice(0, 10)
const COLS = ['#4f46e5', '#d97706', '#7c3aed', '#dc2626', '#059669', '#2563eb', '#db2777']

export default function Habits({ user }) {
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#4f46e5')
  const [saving, setSaving] = useState(null)

  const fetchHabits = async () => {
    const { data } = await supabase.from('habits').select('*').eq('user_id', user.id).order('created_at')
    if (data) setHabits(data)
  }
  const fetchLogs = async () => {
    const { data } = await supabase
      .from('habit_logs')
      .select('*, habits!inner(user_id)')
      .eq('habits.user_id', user.id)
    if (data) setLogs(data)
    setLoading(false)
  }

  useEffect(() => { fetchHabits(); fetchLogs() }, [])

  const addHabit = async () => {
    if (!name.trim()) return
    const { data } = await supabase.from('habits').insert({ user_id: user.id, name: name.trim(), color }).select().single()
    if (data) setHabits(h => [...h, data])
    setName('')
  }

  const delHabit = async (id) => {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(h => h.filter(x => x.id !== id))
    setLogs(l => l.filter(x => x.habit_id !== id))
  }

  const isCheckedToday = (hid) => logs.some(l => l.habit_id === hid && l.date === today())

  const toggleToday = async (hid) => {
    setSaving(hid)
    if (isCheckedToday(hid)) {
      await supabase.from('habit_logs').delete().eq('habit_id', hid).eq('date', today())
      setLogs(l => l.filter(x => !(x.habit_id === hid && x.date === today())))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ habit_id: hid, date: today() }).select().single()
      if (data) setLogs(l => [...l, data])
    }
    setSaving(null)
  }

  const getStreak = (hid) => {
    const dates = logs.filter(l => l.habit_id === hid).map(l => l.date).sort()
    let streak = 0
    const d = new Date()
    while (true) {
      const k = d.toISOString().slice(0, 10)
      if (dates.includes(k)) { streak++; d.setDate(d.getDate() - 1) } else break
    }
    return streak
  }

  const getTotalCount = (hid) => logs.filter(l => l.habit_id === hid).length

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(217,119,6,.1)', color: '#d97706' }}><i className="ti ti-flame" /></div>
        Habits
      </div>

      <div className="card">
        <div className="card-title">Add Habit</div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="form-group">
            <input placeholder="Read 20 min, Meditate, Walk 10k steps…" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} />
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0, padding: '0 2px' }}>
            {COLS.map(c => (
              <div key={c} onClick={() => setColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', transition: 'all .15s', border: color === c ? '3px solid #374151' : '2px solid transparent' }} />
            ))}
          </div>
          <button className="btn btn-primary" onClick={addHabit}><i className="ti ti-plus" />Add</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Daily Check-In</span>
          <span className="text-muted text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        {loading && <div className="empty">Loading…</div>}
        {!loading && habits.length === 0 && <div className="empty">No habits yet. Add one above to start tracking!</div>}
        {habits.map(h => {
          const streak = getStreak(h.id)
          const total = getTotalCount(h.id)
          const checked = isCheckedToday(h.id)
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--b)', gap: 14 }}>
              {/* Color indicator */}
              <div style={{ width: 4, height: 48, borderRadius: 2, background: h.color, flexShrink: 0 }} />

              {/* Name + stats */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{h.name}</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: h.color, fontFamily: 'monospace,Calibri', lineHeight: 1 }}>{streak}</div>
                    <div style={{ fontSize: 10, color: 'var(--m)', fontWeight: 600, marginTop: 1 }}>STREAK</div>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--b)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--m)', fontFamily: 'monospace,Calibri', lineHeight: 1 }}>{total}</div>
                    <div style={{ fontSize: 10, color: 'var(--m)', fontWeight: 600, marginTop: 1 }}>TOTAL</div>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--b)' }} />
                  <div style={{ fontSize: 12, color: 'var(--m)' }}>
                    {streak === 0 ? 'No streak yet — check in!' : `${streak} day${streak === 1 ? '' : 's'} in a row 🔥`}
                  </div>
                </div>
              </div>

              {/* Check-in button */}
              <button
                onClick={() => toggleToday(h.id)}
                disabled={saving === h.id}
                style={{
                  width: 52, height: 52, borderRadius: 14,
                  border: checked ? `2px solid ${h.color}` : '2px solid var(--b)',
                  background: checked ? h.color : 'var(--s2)',
                  color: checked ? '#fff' : 'var(--m)',
                  cursor: 'pointer', fontSize: checked ? 20 : 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .2s', flexShrink: 0,
                  boxShadow: checked ? `0 4px 10px ${h.color}44` : 'none'
                }}
              >
                {saving === h.id ? '…' : checked ? <i className="ti ti-check" style={{ fontSize: 22 }} /> : '+'}
              </button>

              <button className="del-btn" style={{ opacity: 1 }} onClick={() => delHabit(h.id)}><i className="ti ti-trash" /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
