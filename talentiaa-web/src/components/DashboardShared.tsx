import { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from './AnimatedBackground';
import NotificationBell from './NotificationBell';

/* ─── Shared Sidebar Item ─── */
export function SideItem({ icon, label, active, onClick, badge }: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.45)', fontWeight: active ? 600 : 400, fontSize: '0.88rem', cursor: 'pointer', transition: 'var(--transition-smooth)', textAlign: 'left' }}>
      {icon}{label}
      {badge !== undefined && badge > 0 && <span style={{ marginLeft: 'auto', background: 'var(--error)', color: 'white', fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>{badge}</span>}
    </button>
  );
}

/* ─── Shared Stat Card ─── */
export function StatCard({ label, value, color, sub }: {
  label: string;
  value: any;
  color: string;
  sub?: string;
}) {
  return (
    <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', transition: 'var(--transition-smooth)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, marginBottom: '0.75rem' }} />
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--secondary)', letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '0.15rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  );
}

/* ─── Shared Dashboard Layout (Sidebar + Main Area) ─── */
export function DashboardLayout({ sidebarItems, children, headerTitle, headerSub, headerActions, userLabel, roleLabel }: {
  sidebarItems: ReactNode;
  children: ReactNode;
  headerTitle: string;
  headerSub: string;
  headerActions?: ReactNode;
  userLabel?: string;
  roleLabel?: string;
}) {
  const { profile, signOut } = useAuth();
  const displayName = userLabel || profile?.full_name || 'User';
  const displayRole = roleLabel || profile?.role || 'User';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-body)' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', background: '#000', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100, animation: 'slideInLeft 0.4s var(--ease-apple)', overflow: 'hidden' }}>
        <AnimatedBackground variant="dots" particleCount={25} color="255, 255, 255" speed={0.15} connectDistance={0} style={{ opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="nav-logo" style={{ color: 'white', fontSize: '1.25rem' }}>Talentiaa</span>
        </div>
        <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sidebarItems}
          </div>
        </nav>
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', padding: '0 0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' }}>{displayName.charAt(0)}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>{displayRole}</div>
            </div>
          </div>
          <button onClick={() => signOut()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, transition: 'var(--transition)' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: '250px', padding: '2rem 2.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', animation: 'fadeInUp 0.5s var(--ease-apple)' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{headerTitle}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>{headerSub}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <NotificationBell />
            {headerActions}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
