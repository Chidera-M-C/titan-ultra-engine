import React, { useState } from 'react';
import { Compass, User, History, Sparkles, MoreHorizontal, Settings, HelpCircle, LogOut } from 'lucide-react';
import NavItem from './NavItem';
import CreditsCard from './CreditsCard';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({ activeTab, onNavigate }) {
  const { user, loginWithGoogle, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getInitial = () => {
    if (user?.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const handleSettings = () => {
    // Add settings logic
    setIsDropdownOpen(false);
  };

  const handleSupport = () => {
    // Add support logic
    setIsDropdownOpen(false);
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
            <div className="user-info">
              <div className="avatar">{getInitial()}</div>
              <span className="user-name">User</span>
            </div>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
              className="more-icon-btn" 
              title="More options"
            >
              <MoreHorizontal size={18} />
            </button>

            {isDropdownOpen && (
              <div className="profile-dropdown">
                <button onClick={handleSettings} className="dropdown-item">
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
                <button onClick={handleSupport} className="dropdown-item">
                  <HelpCircle size={18} />
                  <span>Support</span>
                </button>
                <button onClick={handleLogout} className="dropdown-item logout-item">
                  <LogOut size={18} />
                  <span>Log out</span>
                </button>
              </div>
            )}
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
