import React from 'react';
import { Compass, User, History, Sparkles, MoreHorizontal } from 'lucide-react';
import NavItem from './NavItem';
import CreditsCard from './CreditsCard';

export default function Sidebar({ activeTab, onNavigate }) {
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
          <NavItem 
            icon={History} 
            label="My Images" 
            isActive={activeTab === 'gallery'} 
            onClick={() => onNavigate('gallery')} 
          />
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
        
        <div className="user-profile">
          <div className="avatar">J</div>
          <div className="user-details">
            <span className="name">John Doe</span>
            <span className="handle">@johndoe</span>
          </div>
          <MoreHorizontal size={16} className="more-icon" />
        </div>
      </div>
    </aside>
  );
}
