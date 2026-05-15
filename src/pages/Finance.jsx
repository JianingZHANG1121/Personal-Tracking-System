import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtD = d => { if (!d) return ''; const [,m,dd] = d.split('-'); return `${MONTHS[+m]} ${+dd}` }
const today = () => new Date().toISOString().slice(0, 10)
const TC = { background: '#fff', border: '1px solid #e2e7f0', borderRadius: 9, color: '#0f172a', fontSize: 12 }
const ACCT_COLORS = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#2563eb', '#dc2626', '#0891b2', '#be185d']

const CURRENCIES = [
  { code: 'CNY', symbol: '¥',   label: 'CNY', flag: '🇨🇳' },
  { code: 'HKD', symbol: 'HK$', label: 'HKD',   flag: '🇭🇰' },
  { code: 'USD', symbol: '$',   label: 'USD',   flag: '🇺🇸' },
]

const getCurrency = code => CURRENCIES.find(c => c.code === code) || CURRENCIES[0]
const fmtAmount = (amount, code) => {
  const c = getCurrency(code)
  return `${c.symbol}${Number(amount).toLocaleString()}`
}

export default function Finance({ user }) {
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [acctName, setAcctName] = useState('')
  const [acctCurrency, setAcctCurrency] = useState('CNY')
  const [selAcct, setSelAcct] = useState('')
  const [balDate, setBalDate] = useState(today())
  const [balAmt, setBalAmt] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedAcct, setExpandedAcct] = useState(null)

  const fetchAll = async () => {
    const [ac, ba] = await Promise.all([
      supabase.from('bank_accounts').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('balance_entries')
        .select('*, bank_accounts!inner(user_id)')
        .eq('bank_accounts.user_id', user.id)
        .order('date')
    ])
    if (ac.data) {
      setAccounts(ac.data)
      if (ac.data.length > 0 && !selAcct) setSelAcct(ac.data[0].id)
    }
    if (ba.data) setBalances(ba.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const addAccount = async () => {
    if (!acctName.trim()) return
    const { data } = await supabase
      .from('bank_accounts')
      .insert({ user_id: user.id, name: acctName.trim(), currency: acctCurrency })
      .select().single()
    if (data) {
      setAccounts(a => [...a, data])
      setSelAcct(data.id)
      setAcctName('')
    }
  }

  const logBalance = async () => {
    if (!selAcct || !balAmt) return
    setSaving(true)
    await supabase.from('balance_entries').upsert(
      { account_id: selAcct, date: balDate, balance: parseFloat(balAmt) },
      { onConflict: 'account_id,date' }
    )
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

  const getLatestBalance = aid => {
    const rows = balances.filter(b => b.account_id === aid).sort((a, b) => b.date.localeCompare(a.date))
    return rows[0]?.balance ?? null
  }

  const getChartData = aid =>
    balances
      .filter(b => b.account_id === aid)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(b => ({ name: fmtD(b.date), v: Number(b.balance) }))

  // Totals grouped by currency
  const totalsByCurrency = CURRENCIES.map(c => {
    const accts = accounts.filter(a => (a.currency || 'JPY') === c.code)
    if (accts.length === 0) return null
    const total = accts.reduce((s, a) => s + (getLatestBalance(a.id) || 0), 0)
    return { ...c, total, count: accts.length }
  }).filter(Boolean)

  const selectedAcctObj = accounts.find(a => a.id === selAcct)

  return (
    <div>
      <div className="page-title">
        <div className="page-icon" style={{ background: 'rgba(5,150,105,.1)', color: '#059669' }}>
          <i className="ti ti-wallet" />
        </div>
        Finance
      </div>

      {/* Summary cards by currency */}
      {totalsByCurrency.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {totalsByCurrency.map(c => (
            <div key={c.code} style={{
              flex: 1, minWidth: 140,
              background: 'linear-gradient(135deg, #059669, #047857)',
              borderRadius: 12, padding: '14px 18px', color: '#fff'
            }}>
              <div style={{ fontSize: 12, opacity: .8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 16 }}>{c.flag}</span>
                <span>{c.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace,Calibri' }}>
                {c.symbol}{Number(c.total).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, opacity: .65, marginTop: 3 }}>
                {c.count} account{c.count > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Account */}
      <div className="card">
        <div className="card-title">Add Bank Account</div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Account Name</label>
            <input
              placeholder="e.g. 招商银行, HSBC, Chase…"
              value={acctName}
              onChange={e => setAcctName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAccount()}
            />
          </div>
          <div style={{ width: 160 }}>
            <label className="form-label">Currency</label>
            <select value={acctCurrency} onChange={e => setAcctCurrency(e.target.value)}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag}  {c.code}  {c.symbol}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={addAccount} style={{ alignSelf: 'flex-end' }}>
            <i className="ti ti-plus" />Add
          </button>
        </div>
      </div>

      {/* Log Balance */}
      {accounts.length > 0 && (
        <div className="card">
          <div className="card-title">Record Balance</div>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Account</label>
              <select value={selAcct} onChange={e => setSelAcct(e.target.value)}>
                {accounts.map(a => {
                  const c = getCurrency(a.currency || 'JPY')
                  return (
                    <option key={a.id} value={a.id}>
                      {c.flag} {a.name} ({c.code})
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" value={balDate} onChange={e => setBalDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">
                Balance ({selectedAcctObj ? getCurrency(selectedAcctObj.currency || 'JPY').symbol : ''})
              </label>
              <input type="number" placeholder="0" value={balAmt} onChange={e => setBalAmt(e.target.value)} />
            </div>
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
        const currency = getCurrency(a.currency || 'JPY')
        const acctBalances = balances
          .filter(b => b.account_id === a.id)
          .sort((x, y) => y.date.localeCompare(x.date))

        return (
          <div key={a.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: chart.length > 1 ? 14 : 0 }}>

              {/* Icon with currency badge */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: col + '18', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: col, fontSize: 20
                }}>
                  <i className="ti ti-building-bank" />
                </div>
                <div style={{
                  position: 'absolute', bottom: -5, right: -8,
                  background: '#fff', borderRadius: 6,
                  border: `1.5px solid ${col}`,
                  fontSize: 9, padding: '1px 5px',
                  fontWeight: 800, color: col, lineHeight: 1.5,
                  whiteSpace: 'nowrap'
                }}>
                  {currency.code}
                </div>
              </div>

              {/* Name + balance */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</span>
                  <span style={{ fontSize: 14 }}>{currency.flag}</span>
                </div>
                <div style={{
                  fontSize: 24, fontWeight: 800, color: col,
                  fontFamily: 'monospace,Calibri', lineHeight: 1.1
                }}>
                  {latest !== null ? fmtAmount(latest, currency.code) : '—'}
                </div>
              </div>

              <button className="btn btn-ghost btn-sm" onClick={() => setExpandedAcct(isExpanded ? null : a.id)}>
                <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} />
                {isExpanded ? 'Hide' : 'History'}
              </button>
              <button className="del-btn" style={{ opacity: 1 }} onClick={() => delAccount(a.id)}>
                <i className="ti ti-trash" />
              </button>
            </div>

            {/* Sparkline chart */}
            {chart.length > 1 && (
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chart}>
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={v => `${currency.symbol}${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip contentStyle={TC} formatter={v => [fmtAmount(v, currency.code), 'Balance']} />
                  <Line type="monotone" dataKey="v" stroke={col} strokeWidth={2.5} dot={{ fill: col, r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* History list */}
            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--b)', paddingTop: 12 }}>
                {acctBalances.length === 0
                  ? <div className="empty" style={{ padding: '8px 0' }}>No balance entries yet.</div>
                  : acctBalances.map(b => (
                    <div key={b.id} className="list-item">
                      <span style={{ fontFamily: 'monospace,Calibri', fontWeight: 700, color: col }}>
                        {fmtAmount(b.balance, currency.code)}
                      </span>
                      <span className="text-muted text-sm">{fmtD(b.date)}</span>
                      <button className="del-btn" onClick={() => delBalance(b.id)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )
      })}

      {!loading && accounts.length === 0 && (
        <div className="card">
          <div className="empty">No bank accounts yet. Add your first account above!</div>
        </div>
      )}
    </div>
  )
}
