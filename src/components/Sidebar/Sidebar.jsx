import React from 'react';
import { Compass, User, History, Sparkles, MoreHorizontal } from 'lucide-react';
import NavItem from './NavItem';
import CreditsCard from './CreditsCard';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({ activeTab, onNavigate }) {
  const { user, loginWithGoogle, logout } = useAuth();

  const getHandle = (email) => {
    if (!email) return '@user';
    return `@${email.split('@')[0]}`;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-logo">N</div>
          <span>Nudely</span>
        </div>
        
        <nav className="side-nav">
          <NavItem 
            icon={Compass} 
            label="Explore" 
            isActive={activeTab === 'explore'} 
            onClick={() => onNavigate('explore')} 
          />
          <NavItem 
            icon={User} 
            label="Character" 
            isActive={activeTab === 'character'} 
            onClick={() => onNavigate('character')} 
          />
          {user && (
            <NavItem 
              icon={History} 
              label="My Images" 
              isActive={activeTab === 'gallery'} 
              onClick={() => onNavigate('gallery')} 
            />
          )}
          <NavItem 
            icon={Sparkles} 
            label="Style" 
            isActive={activeTab === 'style'} 
            onClick={() => onNavigate('style')} 
          />
        </nav>
      </div>

      <div className="sidebar-bottom">
        <CreditsCard />
        
        {user ? (
          <div className="user-profile">
            <div className="avatar">{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</div>
            <div className="user-details">
              <span className="name">{user.displayName || 'User'}</span>
              <span className="handle">{getHandle(user.email)}</span>
            </div>
            <button onClick={logout} className="more-icon" title="Logout">
              <MoreHorizontal size={16} />
            </button>
          </div>
        ) : (
          <button onClick={loginWithGoogle} className="google-login-btn">
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}
