import React from 'react';
import { Heart, Megaphone, MessageCircle, CheckCheck } from 'lucide-react';
import './NotificationPanel.css';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function NotifIcon({ type }) {
  if (type === 'like') return <Heart size={14} fill="#ff4b4b" color="#ff4b4b" />;
  if (type === 'comment') return <MessageCircle size={14} color="#a855f7" />;
  return <Megaphone size={14} color="#fbbf24" />;
}

export default function NotificationPanel({ notifications, onMarkAllRead, onMarkOneRead }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <span className="notif-panel-title">Notifications</span>
        {unreadCount > 0 && (
          <button className="notif-mark-all" onClick={onMarkAllRead}>
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item ${!n.read ? 'unread' : ''}`}
              onClick={() => !n.read && onMarkOneRead(n.id)}
            >
              <div className="notif-icon-wrap">
                <NotifIcon type={n.type} />
              </div>
              <div className="notif-content">
                {n.title && <p className="notif-title">{n.title}</p>}
                <p className="notif-message">{n.message}</p>
                <span className="notif-time">{timeAgo(n.created_at)}</span>
              </div>
              {!n.read && <div className="notif-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
