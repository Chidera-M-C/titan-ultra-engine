import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext';
import NotificationPanel from './NotificationPanel';
import { subscribeToPush } from '../../hooks/usePushSubscription.js';
import './NotificationBell.css';

export default function NotificationBell({ onOpenImage }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount]     = useState(0);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const bellRef = useRef(null);
  const subscribedRef = useRef(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  // ── Subscribe to push when user logs in (once per session) ─────────────
  useEffect(() => {
    if (!user || subscribedRef.current) return;
    subscribedRef.current = true;

    // Small delay so the page is fully loaded first
    const timer = setTimeout(() => {
      subscribeToPush(user.id).catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  useEffect(() => {
    if (!user) {
      subscribedRef.current = false;
    }
  }, [user]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  if (!user) return null;

  return (
    <div className="notif-bell-wrapper" ref={bellRef}>
      <button className="notif-bell-btn" onClick={() => setPanelOpen(prev => !prev)}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {panelOpen && (
        <NotificationPanel
          onOpenImage={onOpenImage}
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkOneRead={markOneRead}
        />
      )}
    </div>
  );
}
