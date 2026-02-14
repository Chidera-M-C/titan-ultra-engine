import React from 'react';
import { Compass, User, History, Sparkles, LogOut } from 'lucide-react';
import NavItem from './NavItem';
import CreditsCard from './CreditsCard';
import { useAuth } from '../../context/AuthContext'; // Import the hook
import './Sidebar.css';
import './SidebarExtras.css';

// ... keep imports the same ...

export default function Sidebar({ activeTab, onNavigate }) {
  const { user, loginWithGoogle, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-logo">N</div>
          <span>Nudely</span>
        </div>
        
        <nav className="side-nav">
          <NavItem icon={Compass} label="Explore" isActive={activeTab === 'explore'} onClick={() => onNavigate('explore')} />
          <NavItem icon={User} label="Character" isActive={activeTab === 'character'} onClick={() => onNavigate('character')} />
          {user && <NavItem icon={History} label="My Images" isActive={activeTab === 'gallery'} onClick={() => onNavigate('gallery')} />}
          <NavItem icon={Sparkles} label="Style" isActive={activeTab === 'style'} onClick={() => onNavigate('style')} />
        </nav>
      </div>

      <div className="sidebar-footer">
        {user ? (
          <>
            <CreditsCard />
            <div className="user-profile">
              <div className="user-info">
                <div className="avatar">{user.name.charAt(0)}</div>
                <div className="details">
                  <span className="name">{user.name}</span>
                  <span className="email">{user.email}</span>
                </div>
              </div>
              <button onClick={logout} className="logout-icon-btn" title="Logout">
                <LogOut size={16} />
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
