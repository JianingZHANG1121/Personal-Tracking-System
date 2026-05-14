import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      })
      if (error) setError(error.message)
      else setMessage('Account created! Check your email to confirm, then log in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Invalid email or password.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark"><i className="ti ti-chart-line" /></div>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--t)' }}>
            self<span style={{ color: '#a5b4fc' }}>+</span>track
          </span>
        </div>

        <div className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
        <div className="auth-subtitle" style={{ marginBottom: 24 }}>
          {mode === 'login' ? 'Sign in to your tracker' : 'Start your self-improvement journey'}
        </div>

        {error && <div className="auth-error"><i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}</div>}
        {message && <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="auth-input-group">
              <label className="form-label">Your Name</label>
              <input type="text" placeholder="e.g. Alex" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="auth-input-group">
            <label className="form-label">Email Address</label>
            <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="auth-input-group">
            <label className="form-label">Password</label>
            <input type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px 0' }} disabled={loading}>
            {loading ? 'Please wait…' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); setMessage('') }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  )
}
