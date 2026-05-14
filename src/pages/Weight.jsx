import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtD = d => { if (!d) return ''; const [,m,dd] = d.split('-'); return `${MONTHS[+m]} ${+dd}` }
const today = () => new Date().toISOString().slice(0, 10)

export default function Weight({ user }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: today(), weight: '', body_fat: '', note: '' })
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    const { data } = await supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date')
    if (data) setEntries(data)
    setLoading(false)
  }
  useEffect(() => { fetch() }, [])

  const save = async () => {
    if (!form.weight) return
    setSaving(true)
    const payload = { user_id: user.id, date: form.date, weight: parseFloat(form.weight), body_fat: form.body_fat ? parseFloat(form.body_fat) : null, note: form.note }
    // Upsert: if same date exists, update it
    const { error } = await supabase.from('weight_entries').upsert(payload, { onConflict: 'user_id,date' })
    if (!error) { await fetch(); setForm(f => ({ ...f, weight: '', body_fat: '', note: '' })) }
    setSaving(false)
  }

  const del = async (id) => {
    await supabase.from('weight_entries').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const sorted = [...entries].reverse()
  const chartData = entries.map(e => ({ name: fmtD(e.date), weight: e.weight, fat: e.body_fat }))
  const latest = sorted[0]
  const prev = sorted[1]

  const TC = { background: '#fff', border: '1px solid #e2e7f0', borderRadius: 9, color: '#0f172a', fontSize: 12 }

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(79,70,229,.1)', color: '#4f46e5' }}><i className="ti ti-activity" /></div>
        Weight Tracker
      </div>

      {/* Stats */}
      {latest && (
        <div className="grid-3" style={{ marginBottom: 12 }}>
          <div className="card">
            <div className="text-muted text-sm mb-1">Current Weight</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace,Calibri' }}>{latest.weight} kg</div>
            {prev && <div style={{ fontSize: 12, marginTop: 3, color: latest.weight <= prev.weight ? '#059669' : '#dc2626', fontWeight: 600 }}>
              {latest.weight <= prev.weight ? '↓' : '↑'} {Math.abs(latest.weight - prev.weight).toFixed(1)} kg from last entry
            </div>}
          </div>
          <div className="card">
            <div className="text-muted text-sm mb-1">Body Fat</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#7c3aed', fontFamily: 'monospace,Calibri' }}>{latest.body_fat != null ? `${latest.body_fat}%` : '—'}</div>
          </div>
          <div className="card">
            <div className="text-muted text-sm mb-1">Total Entries</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'monospace,Calibri' }}>{entries.length}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card">
          <div className="card-title">Weight & Body Fat over Time</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="w" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <YAxis yAxisId="f" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit="%" />
              <Tooltip contentStyle={TC} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
              <Line yAxisId="w" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#4f46e5" strokeWidth={2.5} dot={{ fill: '#4f46e5', r: 3 }} activeDot={{ r: 5 }} connectNulls />
              <Line yAxisId="f" type="monotone" dataKey="fat" name="Body Fat (%)" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 3 }} activeDot={{ r: 5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Form */}
      <div className="card">
        <div className="card-title">Log Entry</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Weight (kg)</label><input type="number" step="0.1" placeholder="70.5" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Body Fat %</label><input type="number" step="0.1" placeholder="20.5 (optional)" value={form.body_fat} onChange={e => setForm(f => ({ ...f, body_fat: e.target.value }))} /></div>
          <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ti ti-plus" />{saving ? 'Saving…' : 'Log'}</button>
        </div>
        <div><label className="form-label">Note (optional)</label><input placeholder="How are you feeling?" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-title">History</div>
        {loading && <div className="empty">Loading…</div>}
        {!loading && sorted.length === 0 && <div className="empty">No entries yet. Start logging!</div>}
        {sorted.map(w => (
          <div key={w.id} className="list-item">
            <span style={{ fontFamily: 'monospace,Calibri', fontWeight: 700, fontSize: 17, color: '#4f46e5', minWidth: 64 }}>{w.weight} kg</span>
            {w.body_fat != null && <span className="chip">{w.body_fat}% fat</span>}
            <span className="text-muted text-sm">{fmtD(w.date)}</span>
            {w.note && <span className="text-muted text-sm" style={{ flex: 1 }}>— {w.note}</span>}
            <button className="del-btn" onClick={() => del(w.id)}><i className="ti ti-trash" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
