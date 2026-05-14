import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CATS = ['Work', 'Personal', 'Health', 'Learning', 'Finance', 'Other']
const CC = { Work: 'badge-amber', Personal: 'badge-violet', Health: 'badge-green', Learning: 'badge-blue', Finance: 'badge-green', Other: 'badge-muted' }

export default function Todos({ user }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [cat, setCat] = useState('')
  const [filter, setFilter] = useState('all')

  const fetch = async () => {
    const { data } = await supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setTodos(data)
    setLoading(false)
  }
  useEffect(() => { fetch() }, [])

  const add = async () => {
    if (!text.trim()) return
    const { data } = await supabase.from('todos').insert({ user_id: user.id, text: text.trim(), category: cat, done: false }).select().single()
    if (data) setTodos(t => [data, ...t])
    setText('')
  }

  const toggle = async (id, done) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !done } : t))
    await supabase.from('todos').update({ done: !done }).eq('id', id)
  }

  const del = async (id) => {
    setTodos(todos.filter(t => t.id !== id))
    await supabase.from('todos').delete().eq('id', id)
  }

  const pending = todos.filter(t => !t.done).length
  const filtered = todos.filter(t => filter === 'all' || (filter === 'pending' && !t.done) || (filter === 'done' && t.done))

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(217,119,6,.1)', color: '#d97706' }}><i className="ti ti-check" /></div>
        To-Dos
      </div>

      <div className="card">
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="form-group" style={{ flex: 3 }}>
            <input placeholder="Add a task… (press Enter to add)" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          </div>
          <div className="form-group">
            <select value={cat} onChange={e => setCat(e.target.value)}>
              <option value="">Category</option>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={add}><i className="ti ti-plus" />Add</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['all', `All (${todos.length})`], ['pending', `Pending (${pending})`], ['done', `Done (${todos.filter(t => t.done).length})`]].map(([f, l]) => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-active' : 'btn-ghost'}`} onClick={() => setFilter(f)}>{l}</button>
        ))}
      </div>

      <div className="card">
        {loading && <div className="empty">Loading…</div>}
        {!loading && filtered.length === 0 && <div className="empty">{filter === 'done' ? 'No completed tasks yet.' : 'No tasks here!'}</div>}
        {filtered.map(t => (
          <div key={t.id} className="list-item">
            <div className={`checkbox ${t.done ? 'checked' : ''}`} onClick={() => toggle(t.id, t.done)}>
              {t.done && <i className="ti ti-check" style={{ fontSize: 10 }} />}
            </div>
            <span style={{ flex: 1, fontSize: 14 }} className={t.done ? 'strikethrough' : ''}>{t.text}</span>
            {t.category && <span className={`badge ${CC[t.category] || 'badge-muted'}`}>{t.category}</span>}
            <button className="del-btn" onClick={() => del(t.id)}><i className="ti ti-trash" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
