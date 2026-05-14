import { useState } from 'react'
import { supabase } from '../supabase'
import Dashboard from '../pages/Dashboard'
import Weight from '../pages/Weight'
import Learning from '../pages/Learning'
import Todos from '../pages/Todos'
import Mood from '../pages/Mood'
import Habits from '../pages/Habits'
import Finance from '../pages/Finance'
import Sleep from '../pages/Sleep'
import Fitness from '../pages/Fitness'

const TABS = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
  { id: 'weight',    icon: 'activity',          label: 'Weight' },
  { id: 'learning',  icon: 'book',              label: 'Learning' },
  { id: 'todos',     icon: 'check',             label: 'To-Dos' },
  { id: 'mood',      icon: 'heart',             label: 'Mood' },
  { id: 'habits',    icon: 'flame',             label: 'Habits' },
  { id: 'finance',   icon: 'wallet',            label: 'Finance' },
  { id: 'sleep',     icon: 'moon',              label: 'Sleep' },
  { id: 'fitness',   icon: 'trophy',            label: 'Fitness' },
]

export default function Layout({ user }) {
  const [tab, setTab] = useState('dashboard')
  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'there'

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const renderPage = () => {
    switch (tab) {
      case 'dashboard': return <Dashboard user={user} setTab={setTab} />
      case 'weight':    return <Weight user={user} />
      case 'learning':  return <Learning user={user} />
      case 'todos':     return <Todos user={user} />
      case 'mood':      return <Mood user={user} />
      case 'habits':    return <Habits user={user} />
      case 'finance':   return <Finance user={user} />
      case 'sleep':     return <Sleep user={user} />
      case 'fitness':   return <Fitness user={user} />
      default:          return null
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark"><i className="ti ti-chart-line" /></div>
          <span>self<em style={{ color: '#a5b4fc', fontStyle: 'normal' }}>+</em>track</span>
        </div>

        {TABS.map(t => (
          <button key={t.id} className={`nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <i className={`ti ti-${t.icon}`} />
            {t.label}
          </button>
        ))}

        <div className="sidebar-footer">
          <div style={{ padding: '8px 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(79,70,229,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {name[0].toUpperCase()}
            </div>
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            <button onClick={handleLogout} title="Sign out" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: 17, display: 'flex', padding: 2 }}>
              <i className="ti ti-logout" />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        {renderPage()}
      </main>
    </div>
  )
}
