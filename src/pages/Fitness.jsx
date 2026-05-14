import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const fmtD = d => { if (!d) return ''; const [,m,dd] = d.split('-'); return `${MONTHS[+m]} ${+dd}` }
const today = () => new Date().toISOString().slice(0, 10)
const TYPES = ['Strength', 'Cardio', 'Yoga', 'HIIT', 'Sports', 'Other']
const EXES = ['Squat', 'Deadlift', 'Bench Press', 'Pull-up', 'Push-up', 'Running', 'Cycling', 'Swimming', 'Plank']
const TC2 = { Strength: 'badge-violet', Cardio: 'badge-blue', Yoga: 'badge-green', HIIT: 'badge-red', Sports: 'badge-amber', Other: 'badge-muted' }

export default function Fitness({ user }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: today(), exercise: '', type: 'Strength', sets: '', reps: '', duration: '', distance: '', note: '' })
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    const { data } = await supabase.from('fitness_entries').select('*').eq('user_id', user.id).order('date', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
  }
  useEffect(() => { fetch() }, [])

  const save = async () => {
    if (!form.exercise.trim()) return
    setSaving(true)
    const payload = { user_id: user.id, date: form.date, exercise: form.exercise.trim(), type: form.type, sets: form.sets ? parseInt(form.sets) : null, reps: form.reps ? parseInt(form.reps) : null, duration: form.duration ? parseInt(form.duration) : null, distance: form.distance ? parseFloat(form.distance) : null, note: form.note }
    const { data } = await supabase.from('fitness_entries').insert(payload).select().single()
    if (data) setEntries(e => [data, ...e])
    setForm(f => ({ ...f, exercise: '', sets: '', reps: '', duration: '', distance: '', note: '' }))
    setSaving(false)
  }

  const del = async (id) => {
    await supabase.from('fitness_entries').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const wkStart = new Date(); wkStart.setDate(wkStart.getDate() - 6)
  const wkEntries = entries.filter(f => new Date(f.date) >= wkStart)

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}><i className="ti ti-trophy" /></div>
        Fitness
      </div>

      <div className="grid-3" style={{ marginBottom: 12 }}>
        <div className="card"><div className="text-muted text-sm mb-1">This Week</div><div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{wkEntries.length} sessions</div></div>
        <div className="card"><div className="text-muted text-sm mb-1">Total Sessions</div><div style={{ fontSize: 24, fontWeight: 700 }}>{entries.length}</div></div>
        <div className="card"><div className="text-muted text-sm mb-1">Last Exercise</div><div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{entries[0]?.exercise || '—'}</div></div>
      </div>

      {/* Weekly activity dots */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">This Week's Activity</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - 6 + i)
            const dk = d.toISOString().slice(0, 10)
            const sessions = entries.filter(f => f.date === dk)
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 10, borderRadius: 5, background: sessions.length > 0 ? '#7c3aed' : 'var(--b)', marginBottom: 4 }} />
                <div style={{ fontSize: 11, color: 'var(--m)', fontWeight: 600 }}>{DAYS[d.getDay()][0]}</div>
                {sessions.length > 0 && <div style={{ fontSize: 10, color: '#7c3aed' }}>{sessions.length}</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Log Workout</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Exercise</label>
            <input list="exlist" placeholder="Squat, Running, Yoga…" value={form.exercise} onChange={e => setForm(f => ({ ...f, exercise: e.target.value }))} />
            <datalist id="exlist">{EXES.map(ex => <option key={ex}>{ex}</option>)}</datalist>
          </div>
          <div style={{ width: 106 }}><label className="form-label">Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Sets</label><input type="number" placeholder="3" value={form.sets} onChange={e => setForm(f => ({ ...f, sets: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Reps</label><input type="number" placeholder="10" value={form.reps} onChange={e => setForm(f => ({ ...f, reps: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Duration (min)</label><input type="number" placeholder="30" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Distance (km)</label><input type="number" step="0.1" placeholder="5.0" value={form.distance} onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} /></div>
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-end' }}><i className="ti ti-plus" />{saving ? '…' : 'Log'}</button>
        </div>
        <div><label className="form-label">Notes</label><input placeholder="How was it? Personal best?" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
      </div>

      <div className="card">
        <div className="card-title">Workout Log</div>
        {loading && <div className="empty">Loading…</div>}
        {!loading && entries.length === 0 && <div className="empty">No workouts logged yet. Let's get moving! 💪</div>}
        {entries.map(f => (
          <div key={f.id} className="list-item">
            <span style={{ fontWeight: 600, flex: 1, fontSize: 14 }}>{f.exercise}</span>
            {f.type && <span className={`badge ${TC2[f.type] || 'badge-muted'}`}>{f.type}</span>}
            <span className="text-muted text-sm" style={{ fontFamily: 'monospace,Calibri', whiteSpace: 'nowrap' }}>
              {[f.sets && f.reps && `${f.sets}×${f.reps}`, f.duration && `${f.duration}min`, f.distance && `${f.distance}km`].filter(Boolean).join(' · ')}
            </span>
            <span className="text-muted text-sm">{fmtD(f.date)}</span>
            {f.note && <span className="text-muted text-sm">— {f.note}</span>}
            <button className="del-btn" onClick={() => del(f.id)}><i className="ti ti-trash" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
