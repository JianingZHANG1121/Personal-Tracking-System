import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtD = d => { if (!d) return ''; const [,m,dd] = d.split('-'); return `${MONTHS[+m]} ${+dd}` }
const today = () => new Date().toISOString().slice(0, 10)
const TC = { background: '#fff', border: '1px solid #e2e7f0', borderRadius: 9, color: '#0f172a', fontSize: 12 }
const ACCT_COLORS = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#2563eb', '#dc2626']

export default function Finance({ user }) {
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [acctName, setAcctName] = useState('')
  const [selAcct, setSelAcct] = useState('')
  const [balDate, setBalDate] = useState(today())
  const [balAmt, setBalAmt] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedAcct, setExpandedAcct] = useState(null)

  const fetchAll = async () => {
    const [ac, ba] = await Promise.all([
      supabase.from('bank_accounts').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('balance_entries').select('*, bank_accounts!inner(user_id)').eq('bank_accounts.user_id', user.id).order('date')
    ])
    if (ac.data) { setAccounts(ac.data); if (ac.data.length > 0 && !selAcct) setSelAcct(ac.data[0].id) }
    if (ba.data) setBalances(ba.data)
    setLoading(false)
  }
  useEffect(() => { fetchAll() }, [])

  const addAccount = async () => {
    if (!acctName.trim()) return
    const { data } = await supabase.from('bank_accounts').insert({ user_id: user.id, name: acctName.trim() }).select().single()
    if (data) { setAccounts(a => [...a, data]); setSelAcct(data.id); setAcctName('') }
  }

  const logBalance = async () => {
    if (!selAcct || !balAmt) return
    setSaving(true)
    await supabase.from('balance_entries').upsert({ account_id: selAcct, date: balDate, balance: parseFloat(balAmt) }, { onConflict: 'account_id,date' })
    await fetchAll()
    setBalAmt('')
    setSaving(false)
  }

  const delAccount = async (id) => {
    await supabase.from('bank_accounts').delete().eq('id', id)
    setAccounts(a => a.filter(x => x.id !== id))
    setBalances(b => b.filter(x => x.account_id !== id))
    if (selAcct === id) setSelAcct(accounts.find(a => a.id !== id)?.id || '')
  }

  const delBalance = async (id) => {
    await supabase.from('balance_entries').delete().eq('id', id)
    setBalances(b => b.filter(x => x.id !== id))
  }

  const getLatestBalance = (aid) => {
    const rows = balances.filter(b => b.account_id === aid).sort((a, b) => b.date.localeCompare(a.date))
    return rows[0]?.balance ?? null
  }

  const getChartData = (aid) => balances.filter(b => b.account_id === aid).sort((a, b) => a.date.localeCompare(b.date)).map(b => ({ name: fmtD(b.date), v: Number(b.balance) }))

  const totalBalance = accounts.reduce((s, a) => s + (getLatestBalance(a.id) || 0), 0)

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(5,150,105,.1)', color: '#059669' }}><i className="ti ti-wallet" /></div>
        Finance
      </div>

      {/* Total */}
      {accounts.length > 0 && (
        <div className="card" style={{ marginBottom: 12, background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none' }}>
          <div style={{ fontSize: 13, opacity: .8, marginBottom: 4 }}>Total Balance (all accounts)</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'monospace,Calibri' }}>¥{totalBalance.toLocaleString()}</div>
        </div>
      )}

      {/* Add Account */}
      <div className="card">
        <div className="card-title">Add Bank Account</div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="form-group"><input placeholder="e.g. Main Bank, Savings, NISA…" value={acctName} onChange={e => setAcctName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAccount()} /></div>
          <button className="btn btn-primary" onClick={addAccount}><i className="ti ti-plus" />Add Account</button>
        </div>
      </div>

      {/* Log Balance */}
      {accounts.length > 0 && (
        <div className="card">
          <div className="card-title">Record Today's Balance</div>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Account</label>
              <select value={selAcct} onChange={e => setSelAcct(e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Date</label><input type="date" value={balDate} onChange={e => setBalDate(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Balance (¥)</label><input type="number" placeholder="0" value={balAmt} onChange={e => setBalAmt(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={logBalance} disabled={saving} style={{ alignSelf: 'flex-end' }}>
              <i className="ti ti-check" />{saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Account Cards */}
      {loading && <div className="card"><div className="empty">Loading…</div></div>}
      {accounts.map((a, idx) => {
        const col = ACCT_COLORS[idx % ACCT_COLORS.length]
        const latest = getLatestBalance(a.id)
        const chart = getChartData(a.id)
        const isExpanded = expandedAcct === a.id
        const acctBalances = balances.filter(b => b.account_id === a.id).sort((x, y) => y.date.localeCompare(x.date))

        return (
          <div key={a.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: chart.length > 1 ? 12 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: col + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, fontSize: 18, flexShrink: 0 }}>
                <i className="ti ti-building-bank" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: 'monospace,Calibri' }}>
                  {latest !== null ? `¥${Number(latest).toLocaleString()}` : '—'}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpandedAcct(isExpanded ? null : a.id)}>
                <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} />{isExpanded ? 'Hide' : 'History'}
              </button>
              <button className="del-btn" style={{ opacity: 1 }} onClick={() => delAccount(a.id)}><i className="ti ti-trash" /></button>
            </div>

            {chart.length > 1 && (
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chart}>
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TC} formatter={v => [`¥${Number(v).toLocaleString()}`, 'Balance']} />
                  <Line type="monotone" dataKey="v" stroke={col} strokeWidth={2.5} dot={{ fill: col, r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--b)', paddingTop: 12 }}>
                {acctBalances.length === 0
                  ? <div className="empty" style={{ padding: '8px 0' }}>No balance entries yet.</div>
                  : acctBalances.map(b => (
                    <div key={b.id} className="list-item">
                      <span style={{ fontFamily: 'monospace,Calibri', fontWeight: 700, color: col }}>¥{Number(b.balance).toLocaleString()}</span>
                      <span className="text-muted text-sm">{fmtD(b.date)}</span>
                      <button className="del-btn" onClick={() => delBalance(b.id)}><i className="ti ti-trash" /></button>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )
      })}

      {!loading && accounts.length === 0 && (
        <div className="card"><div className="empty">No bank accounts yet. Add your first account above!</div></div>
      )}
    </div>
  )
}
