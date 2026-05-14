import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtD = d => { if (!d) return ''; const [,m,dd] = d.split('-'); return `${MONTHS[+m]} ${+dd}` }
const today = () => new Date().toISOString().slice(0, 10)
const EMOJIS = ['😞', '😕', '😐', '🙂', '😊']
const LABELS = ['Bad', 'Poor', 'Okay', 'Good', 'Great']
const BC = ['badge-red', 'badge-amber', 'badge-muted', 'badge-green', 'badge-green']
const TC = { background: '#fff', border: '1px solid #e2e7f0', borderRadius: 9, color: '#0f172a', fontSize: 12 }

export default function Mood({ user }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: today(), score: 3, note: '' })
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    const { data } = await supabase.from('mood_entries').select('*').eq('user_id', user.id).order('date')
    if (data) setEntries(data)
    setLoading(false)
  }
  useEffect(() => { fetch() }, [])

  const save = async () => {
    setSaving(true)
    const payload = { user_id: user.id, date: form.date, score: form.score, note: form.note }
    await supabase.from('mood_entries').upsert(payload, { onConflict: 'user_id,date' })
    await fetch()
    setForm(f => ({ ...f, note: '' }))
    setSaving(false)
  }

  const del = async (id) => {
    await supabase.from('mood_entries').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  // 7-day rolling average
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const recent7 = entries.filter(e => new Date(e.date) >= sevenDaysAgo)
  const avg7 = recent7.length ? (recent7.reduce((s, e) => s + e.score, 0) / recent7.length).toFixed(1) : null

  const chartData = entries.slice(-21).map(e => ({ name: fmtD(e.date), v: e.score }))
  const sorted = [...entries].reverse()

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}><i className="ti ti-heart" /></div>
        Mood
      </div>

      {avg7 && (
        <div className="grid-3" style={{ marginBottom: 12 }}>
          <div className="card">
            <div className="text-muted text-sm mb-1">7-Day Avg Mood</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>{EMOJIS[Math.round(+avg7) - 1]}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{avg7}/5</span>
            </div>
            <div className="text-muted text-sm mt-1">{recent7.length} entries this week</div>
          </div>
          <div className="card">
            <div className="text-muted text-sm mb-1">Today</div>
            <div style={{ fontSize: 28 }}>{entries.find(e => e.date === today()) ? EMOJIS[entries.find(e => e.date === today()).score - 1] : '—'}</div>
            <div className="text-muted text-sm mt-1">{entries.find(e => e.date === today()) ? LABELS[entries.find(e => e.date === today()).score - 1] : 'Not logged yet'}</div>
          </div>
          <div className="card">
            <div className="text-muted text-sm mb-1">All-Time Entries</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{entries.length}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Log Today's Mood</div>
        <div style={{ marginBottom: 12 }}>
          <label className="form-label">How are you feeling?</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {EMOJIS.map((em, i) => (
              <button key={i} className={`mood-btn ${form.score === i + 1 ? 'selected' : ''}`} onClick={() => setForm(f => ({ ...f, score: i + 1 }))} title={LABELS[i]}>{em}</button>
            ))}
            <span style={{ color: 'var(--m)', alignSelf: 'center', fontSize: 13, fontWeight: 600, marginLeft: 4 }}>{LABELS[form.score - 1]}</span>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ti ti-check" />{saving ? 'Saving…' : 'Save'}</button>
        </div>
        <div><label className="form-label">Notes (optional)</label>
          <textarea placeholder="What's on your mind?" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
      </div>

      {chartData.length > 1 && (
        <div className="card">
          <div className="card-title">Mood Trend (last 21 days)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TC} formatter={v => [EMOJIS[v - 1] + ' ' + LABELS[v - 1], 'Mood']} />
              <Line type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div className="card-title">Recent Log</div>
        {loading && <div className="empty">Loading…</div>}
        {!loading && sorted.length === 0 && <div className="empty">No mood entries yet. How are you feeling today?</div>}
        {sorted.slice(0, 14).map(m => (
          <div key={m.id} className="list-item">
            <span style={{ fontSize: 20 }}>{EMOJIS[m.score - 1]}</span>
            <span className={`badge ${BC[m.score - 1]}`}>{LABELS[m.score - 1]}</span>
            <span className="text-muted text-sm">{fmtD(m.date)}</span>
            {m.note && <span className="text-muted text-sm" style={{ flex: 1 }}>— {m.note}</span>}
            <button className="del-btn" onClick={() => del(m.id)}><i className="ti ti-trash" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
