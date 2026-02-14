import React from 'react';
import { Compass, User, History, Sparkles, LogOut } from 'lucide-react';
import NavItem from './NavItem';
import CreditsCard from './CreditsCard';
import { useAuth } from '../../context/AuthContext'; // Import the hook
import './Sidebar.css';
import './SidebarExtras.css';

export default function Sidebar({ activeTab, onNavigate }) {
  const { user, loginWithGoogle, logout } = useAuth(); // Get auth state

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
          {/* Only show "My Images" if logged in, otherwise it's empty anyway */}
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
        {/* 1. Only show Credits if logged in */}
        {user && <CreditsCard />}
        
        {/* 2. Toggle between Login Button and User Profile */}
        {user ? (
          <div className="user-profile">
            <div className="avatar">
              {/* Show first letter of name */}
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="name">{user.name}</span>
              {/* Truncate email to look like a handle */}
              <span className="handle">@{user.email.split('@')[0]}</span>
            </div>
            <button onClick={logout} className="logout-btn" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button onClick={loginWithGoogle} className="google-login-btn">
            <span className="g-icon">G</span>
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}
