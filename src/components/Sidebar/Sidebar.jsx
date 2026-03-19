import React, { useState, useRef, useEffect } from 'react';
import { Compass, Images, Sparkles, Wand2, User, RefreshCw, MoreHorizontal, Settings, HelpCircle, LogOut } from 'lucide-react';
import NavItem from './NavItem';
import CreditsCard from './CreditsCard';
import Promptimize from './Promptimize';
import { useAuth } from '../../context/AuthContext';
import NudelyLogo from '../../assets/nudely-logo.png';
import './Sidebar.css';

export default function Sidebar({ activeTab, onNavigate, credits, userId, isOpen, onPromptLoad, currentPrompt }) {
  const { user, loginWithGoogle, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const profileRef = useRef(null);

  const getInitial = () => {
    if (user?.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const handleLogout = () => { logout(); setIsDropdownOpen(false); };
  const handleSettings = () => setIsDropdownOpen(false);
  const handleSupport = () => setIsDropdownOpen(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-top">
        <div className="brand">
          <img src={NudelyLogo} alt="Nudely" style={{ height: '24px', width: 'auto' }} />
        </div>

        <nav className="side-nav">

          {/* Section 1 */}
          <div className="nav-section">
            <NavItem icon={Compass} label="Explore" isActive={activeTab === 'explore'} onClick={() => onNavigate('explore')} />
            <NavItem icon={Sparkles} label="Style" isActive={activeTab === 'style'} onClick={() => onNavigate('style')} />
            {user && (
              <NavItem icon={Images} label="My Images" isActive={activeTab === 'gallery'} onClick={() => onNavigate('gallery')} />
            )}
          </div>
        
          {/* Section 2 — Deep Dive */}
          <div className="nav-section">
            <p className="nav-section-title">Deep Dive</p>
            <NavItem icon={Wand2} label="Edit Image" isActive={activeTab === 'edit'} onClick={() => onNavigate('edit')} />
            <NavItem icon={User} label="Character" isActive={activeTab === 'character'} onClick={() => onNavigate('character')} />
            <NavItem icon={RefreshCw} label="Face Swap" isActive={activeTab === 'faceswap'} onClick={() => onNavigate('faceswap')} />
          </div>
        
        </nav>

        <div className="sidebar-promptimize">
          <Promptimize onLoad={onPromptLoad} currentPrompt={currentPrompt} />
        </div>
      </div>

      <div className="sidebar-bottom">
        <CreditsCard credits={credits} userId={userId} />

        {user ? (
          <div className="user-profile" ref={profileRef}>
            <div className="user-info">
              <div className="avatar">{getInitial()}</div>
              <span className="user-name">User</span>
            </div>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="more-icon-btn" title="More options">
              <MoreHorizontal size={18} />
            </button>
            {isDropdownOpen && (
              <div className="profile-dropdown">
                <button onClick={handleSettings} className="dropdown-item"><Settings size={18} /><span>Settings</span></button>
                <button onClick={handleSupport} className="dropdown-item"><HelpCircle size={18} /><span>Support</span></button>
                <button onClick={handleLogout} className="dropdown-item logout-item"><LogOut size={18} /><span>Log out</span></button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={loginWithGoogle} className="google-login-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" className="google-icon">
              <g fill="none" fillRule="evenodd">
                <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8445c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9086c1.7018-1.5668 2.6827-3.8745 2.6827-6.6154z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1805l-2.9086-2.2581c-.8059.54-1.8373.8591-3.0477.8591-2.3445 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.1818-.54-.2864-1.1168-.2864-1.71s.1046-1.17.2864-1.71V4.9582H.9573C.3473 6.1736 0 7.5477 0 9s.3473 2.8264.9573 4.0418l3.0068-2.3318z" fill="#FBBC05"/>
                <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3464l2.5818-2.5818C13.4636.9627 11.4264 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6555 3.5795 9 3.5795z" fill="#EA4335"/>
              </g>
            </svg>
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}
