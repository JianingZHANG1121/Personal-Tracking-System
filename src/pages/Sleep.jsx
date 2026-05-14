import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const fmtD = d => { if (!d) return ''; const [,m,dd] = d.split('-'); return `${MONTHS[+m]} ${+dd}` }
const today = () => new Date().toISOString().slice(0, 10)
const TC = { background: '#fff', border: '1px solid #e2e7f0', borderRadius: 9, color: '#0f172a', fontSize: 12 }

function calcHours(sleepTime, wakeTime) {
  const [sh, sm] = sleepTime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let mins = (wh * 60 + wm) - (sh * 60 + sm)
  if (mins < 0) mins += 1440 // crosses midnight
  return +(mins / 60).toFixed(1)
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function Sleep({ user }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: today(), sleep_time: '23:00', wake_time: '07:00', note: '' })
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    const { data } = await supabase.from('sleep_entries').select('*').eq('user_id', user.id).order('date')
    if (data) setEntries(data)
    setLoading(false)
  }
  useEffect(() => { fetch() }, [])

  const save = async () => {
    setSaving(true)
    const payload = { user_id: user.id, date: form.date, sleep_time: form.sleep_time, wake_time: form.wake_time, note: form.note }
    await supabase.from('sleep_entries').upsert(payload, { onConflict: 'user_id,date' })
    await fetch()
    setForm(f => ({ ...f, note: '' }))
    setSaving(false)
  }

  const del = async (id) => {
    await supabase.from('sleep_entries').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const sorted = [...entries].reverse()

  // Last 7 days chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i)
    const dk = d.toISOString().slice(0, 10)
    const entry = entries.find(e => e.date === dk)
    return {
      name: DAYS[d.getDay()],
      hours: entry ? calcHours(entry.sleep_time, entry.wake_time) : null,
      date: dk
    }
  })

  const recentHours = chartData.filter(d => d.hours !== null).map(d => d.hours)
  const avgSleep = recentHours.length ? (recentHours.reduce((s, h) => s + h, 0) / recentHours.length).toFixed(1) : null
  const lastEntry = sorted[0]
  const lastHours = lastEntry ? calcHours(lastEntry.sleep_time, lastEntry.wake_time) : null

  const previewHours = form.sleep_time && form.wake_time ? calcHours(form.sleep_time, form.wake_time) : null

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(37,99,235,.1)', color: '#2563eb' }}><i className="ti ti-moon" /></div>
        Sleep
      </div>

      {avgSleep && (
        <div className="grid-3" style={{ marginBottom: 12 }}>
          <div className="card">
            <div className="text-muted text-sm mb-1">7-Day Avg</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace,Calibri' }}>{avgSleep}h</div>
            <div className="text-muted text-sm mt-1">{recentHours.length} nights logged</div>
          </div>
          <div className="card">
            <div className="text-muted text-sm mb-1">Last Night</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: lastHours && lastHours >= 7 ? '#059669' : '#d97706', fontFamily: 'monospace,Calibri' }}>{lastHours}h</div>
            {lastEntry && <div className="text-muted text-sm mt-1">{fmtTime(lastEntry.sleep_time)} → {fmtTime(lastEntry.wake_time)}</div>}
          </div>
          <div className="card">
            <div className="text-muted text-sm mb-1">Total Nights</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{entries.length}</div>
          </div>
        </div>
      )}

      {/* 7-day bar chart */}
      {entries.length > 0 && (
        <div className="card">
          <div className="card-title">Sleep Duration — Past 7 Days</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 12]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip contentStyle={TC} formatter={v => v !== null ? [`${v}h`, 'Sleep'] : ['—', 'No data']} />
              <ReferenceLine y={8} stroke="#059669" strokeDasharray="4 4" label={{ value: '8h goal', fill: '#059669', fontSize: 11, position: 'right' }} />
              <Bar dataKey="hours" fill="#2563eb" radius={[5, 5, 0, 0]}
                label={{ position: 'top', fill: '#64748b', fontSize: 11, formatter: v => v ? `${v}h` : '' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div className="card-title">Log Sleep</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Sleep Time</label><input type="time" value={form.sleep_time} onChange={e => setForm(f => ({ ...f, sleep_time: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Wake-Up Time</label><input type="time" value={form.wake_time} onChange={e => setForm(f => ({ ...f, wake_time: e.target.value }))} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {previewHours && (
              <div style={{ textAlign: 'center', padding: '4px 10px', background: previewHours >= 7 ? '#d1fae5' : '#fef3c7', borderRadius: 7, marginBottom: 6, fontSize: 13, fontWeight: 700, color: previewHours >= 7 ? '#065f46' : '#92400e' }}>
                {previewHours}h
              </div>
            )}
            <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ti ti-check" />{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
        <div><label className="form-label">Notes (optional)</label><input placeholder="How did you sleep?" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
      </div>

      <div className="card">
        <div className="card-title">Sleep Log</div>
        {loading && <div className="empty">Loading…</div>}
        {!loading && sorted.length === 0 && <div className="empty">No sleep data yet. Start logging tonight!</div>}
        {sorted.map(s => {
          const h = calcHours(s.sleep_time, s.wake_time)
          return (
            <div key={s.id} className="list-item">
              <span style={{ fontFamily: 'monospace,Calibri', fontWeight: 700, fontSize: 18, color: h >= 7 ? '#059669' : '#d97706', minWidth: 42 }}>{h}h</span>
              <span className="chip">{fmtTime(s.sleep_time)} → {fmtTime(s.wake_time)}</span>
              <span className="text-muted text-sm">{fmtD(s.date)}</span>
              {s.note && <span className="text-muted text-sm" style={{ flex: 1 }}>— {s.note}</span>}
              <button className="del-btn" onClick={() => del(s.id)}><i className="ti ti-trash" /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
