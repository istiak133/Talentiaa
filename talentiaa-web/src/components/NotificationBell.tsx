import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AppNotification } from '../types/database';

export default function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!profile) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setNotifications(data);
    };

    fetchNotifications();

    // Setup real-time subscription
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, payload => {
        setNotifications(prev => [payload.new as AppNotification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [profile]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile?.id).eq('is_read', false);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: isOpen ? '#f1f5f9' : 'transparent', transition: 'all 0.2s' }}
      >
        <Bell size={20} color="#475569" />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '2px', right: '4px', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }}></span>
        )}
      </button>

      {isOpen && (
        <div style={{ position: 'absolute', top: '44px', right: '0', width: '320px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                Mark all as read
              </button>
            )}
          </div>
          
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                <Bell size={24} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                No notifications yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(notification => (
                  <div key={notification.id} style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', background: notification.is_read ? '#fff' : '#eff6ff', display: 'flex', gap: '12px', transition: 'all 0.2s' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: notification.is_read ? 'transparent' : '#3b82f6', marginTop: '6px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: notification.is_read ? 600 : 700, color: '#0f172a', margin: 0 }}>{notification.title}</h4>
                        <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.4 }}>{notification.message}</p>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {!notification.is_read && (
                          <button onClick={() => markAsRead(notification.id)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> Mark read
                          </button>
                        )}
                        <button onClick={() => deleteNotification(notification.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
