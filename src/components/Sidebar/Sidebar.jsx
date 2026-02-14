import React from 'react';
import { Compass, User, History, Sparkles, MoreHorizontal } from 'lucide-react';
import NavItem from './NavItem';
import CreditsCard from './CreditsCard';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';
import './SidebarExtras.css';

export default function Sidebar({ activeTab, onNavigate }) {
  const { user, loginWithGoogle, logout } = useAuth();

  // Derive handle from email (e.g., "john.doe@gmail.com" -> "@johndoe")
  const getHandle = (email) => {
    if (!email) return '@user';
    const localPart = email.split('@')[0];
    return `@${localPart}`;
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

      <div className="sidebar-footer">
        {user ? (
          <>
            <CreditsCard />
            <div className="user-profile">
              <div className="user-info">
                <div className="avatar">{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</div>
                <div className="details">
                  <span className="name">{user.displayName || user.email || 'User'}</span>
                  <span className="handle">{getHandle(user.email)}</span>
                </div>
              </div>
              <button 
                onClick={logout} 
                className="more-icon-btn" 
                title="More options"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </>
        ) : (
          <button onClick={loginWithGoogle} className="google-login-btn">
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}
