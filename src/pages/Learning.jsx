import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CATS = ['Course', 'Book', 'Skill', 'Language', 'Certificate', 'Other']
const CC = { Course: 'badge-amber', Book: 'badge-violet', Skill: 'badge-green', Language: 'badge-red', Certificate: 'badge-green', Other: 'badge-muted' }

export default function Learning({ user }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', category: '', goal: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    const { data } = await supabase.from('learning_items').select('*').eq('user_id', user.id).order('created_at')
    if (data) setItems(data)
    setLoading(false)
  }
  useEffect(() => { fetch() }, [])

  const add = async () => {
    if (!form.title.trim()) return
    setError('')
    const dup = items.find(i => i.title.toLowerCase() === form.title.trim().toLowerCase() && i.category === form.category)
    if (dup) { setError(`"${form.title}" already exists in this category. Update its progress below.`); return }
    setSaving(true)
    const { error: err } = await supabase.from('learning_items').insert({ user_id: user.id, title: form.title.trim(), category: form.category, goal: form.goal, progress: 0 })
    if (!err) { await fetch(); setForm({ title: '', category: '', goal: '' }) }
    setSaving(false)
  }

  const updateProgress = async (id, val) => {
    const v = Math.min(100, Math.max(0, parseInt(val) || 0))
    setItems(items.map(i => i.id === id ? { ...i, progress: v } : i))
    await supabase.from('learning_items').update({ progress: v }).eq('id', id)
  }

  const del = async (id) => {
    await supabase.from('learning_items').delete().eq('id', id)
    setItems(items.filter(x => x.id !== id))
  }

  const done = items.filter(i => i.progress === 100).length
  const avg = items.length ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(79,70,229,.1)', color: '#4f46e5' }}><i className="ti ti-book" /></div>
        Learning Progress
      </div>

      {items.length > 0 && (
        <div className="grid-3" style={{ marginBottom: 12 }}>
          <div className="card"><div className="text-muted text-sm mb-1">Tracking</div><div style={{ fontSize: 24, fontWeight: 700 }}>{items.length} items</div></div>
          <div className="card"><div className="text-muted text-sm mb-1">Avg Progress</div><div style={{ fontSize: 24, fontWeight: 700, color: '#4f46e5' }}>{avg}%</div></div>
          <div className="card"><div className="text-muted text-sm mb-1">Completed</div><div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{done}</div></div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Add New Item</div>
        {error && <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}><i className="ti ti-info-circle" style={{ marginRight: 6 }} />{error}</div>}
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}><label className="form-label">Title</label><input placeholder="React course, Japanese N3, Piano..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && add()} /></div>
          <div className="form-group"><label className="form-label">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">— Select —</option>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={add} disabled={saving}><i className="ti ti-plus" />{saving ? '…' : 'Add'}</button>
        </div>
        <div><label className="form-label">Goal / Notes (optional)</label><input placeholder="What do you want to achieve?" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} /></div>
      </div>

      <div className="card">
        <div className="card-title">Progress Board</div>
        {loading && <div className="empty">Loading…</div>}
        {!loading && items.length === 0 && <div className="empty">Nothing tracked yet. Add your first learning goal!</div>}
        {items.map(item => (
          <div key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--b)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {item.category && <span className={`badge ${CC[item.category] || 'badge-muted'}`}>{item.category}</span>}
              <span style={{ fontWeight: 600, flex: 1, fontSize: 14 }}>{item.title}</span>
              {item.progress === 100 && <span className="badge badge-green">✓ Complete</span>}
              <button className="del-btn" style={{ opacity: 1, marginLeft: 0 }} onClick={() => del(item.id)}><i className="ti ti-trash" /></button>
            </div>
            {item.goal && <div className="text-muted text-sm" style={{ marginBottom: 8 }}>{item.goal}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${item.progress}%`, background: item.progress === 100 ? '#059669' : '#4f46e5' }} />
                </div>
              </div>
              <input
                type="number" min="0" max="100"
                value={item.progress}
                onChange={e => updateProgress(item.id, e.target.value)}
                style={{ width: 62, padding: '4px 8px', fontSize: 13, textAlign: 'center' }}
              />
              <span className="text-muted text-sm">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
