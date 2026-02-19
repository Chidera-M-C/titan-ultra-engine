import React, { useState, useEffect } from 'react';
import './App.css';
// --- APPWRITE & AUTH ---
import { useAuth } from './context/AuthContext';
import { saveAiImage } from './lib/imageService.js';
import { db } from './lib/appwrite.js';
import { Query } from 'appwrite';
// --- COMPONENTS ---
import Sidebar from './components/Sidebar/Sidebar';
import PromptBox from './components/PromptSection/PromptBox';
import ResultModal from './components/Shared/ResultModal';
import EditModal from './components/Shared/EditModal';
import ImageViewModal from './components/Shared/ImageViewModal';
import LoginModal from './components/LoginModal'; 
// --- VIEWS ---
import ExploreView from './views/ExploreView';
import CharacterView from './views/CharacterView';
import MyImagesView from './views/MyImagesView';
import StyleView from './views/StyleView';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  // --- GLOBAL STATE ---
  const [activeTab, setActiveTab] = useState('explore');
  const [viewState, setViewState] = useState('gallery');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3');
  const [image, setImage] = useState(null);
  const [userGallery, setUserGallery] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credits, setCredits] = useState(0);

  // --- MODAL STATES ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [promptCollapsed, setPromptCollapsed] = useState(false);

  // --- GLOBAL CLICK PROTECTION ---
  const handleGlobalClick = (e) => {
    // If user is logged in, we don't care about clicks
    if (user || authLoading) return;

    // List of classes that are ALLOWED to be clicked by visitors
    const whitelist = [
      'allow-visitor', 
      'modal-overlay', 
      'close-button', 
      'login-modal-card', 
      'google-signin-btn',
      'image-view-img'
    ];

    // Check if the click target or any parent is in the whitelist
    const isAllowed = whitelist.some(cls => e.target.closest(`.${cls}`));

    if (!isAllowed) {
      // If it's not allowed (Sidebar, Tabs, Generate, etc), show login
      e.stopPropagation();
      setLoginModalOpen(true);
    }
  };

  const loadGallery = async () => {
    if (!user) {
      setUserGallery([]);
      return;
    }
    try {
      const userDoc = await db.getDocument('main_db', 'users', user.$id);
      setCredits(userDoc.credits || 0);
      const response = await db.listDocuments(
        'main_db',
        'images',
        [Query.equal('userId', user.$id), Query.orderDesc('$createdAt')]
      );
      setUserGallery(response.documents.map(doc => ({
        id: doc.$id,
        url: doc.imageUrl,
        prompt: doc.prompt
      })));
    } catch (err) {
      console.error("Gallery Load Error:", err);
    }
  };

  useEffect(() => {
    loadGallery();
    if (!authLoading && !user) {
      const timer = setTimeout(() => setLoginModalOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

  const generateImage = async () => {
    if (!user) { setLoginModalOpen(true); return; }
    if (!prompt || loading) return;
    setViewState('result');
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.output?.image) {
        setImage(data.output.image);
        await db.updateDocument('main_db', 'users', user.$id, { credits: credits - 2 });
        setCredits(prev => prev - 2);
        await saveAiImage(user.$id, data.output.image, prompt);
      }
    } catch (err) {
      setError("Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const handleViewImage = (img) => {
    setViewingImageUrl(img.url);
    setViewImageModalOpen(true);
  };

  return (
    <div className="master-wrapper" onClickCapture={handleGlobalClick}>
      <div className="app-shell">
        <Sidebar activeTab={activeTab} onNavigate={(tab) => setActiveTab(tab)} credits={credits} userId={user?.$id} />
        <main className="main-content">
          <header className="top-header">
            <h1 className="aesthetic-title">What will you create?</h1>
            <PromptBox prompt={prompt} setPrompt={setPrompt} onGenerate={generateImage} loading={loading} credits={credits} />
          </header>
          <div className="scrollable-area">
            <ExploreView 
              onSelectPrompt={(p) => setPrompt(p)} 
              onViewImage={handleViewImage} 
              onEditImage={(img) => { if(!user) setLoginModalOpen(true); else { setEditingImage(img); setEditModalOpen(true); }}} 
            />
          </div>
        </main>
        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
        {viewImageModalOpen && <ImageViewModal imageUrl={viewingImageUrl} onClose={() => setViewImageModalOpen(false)} />}
        {editModalOpen && <EditModal image={editingImage?.url} originalPrompt={editingImage?.prompt} onClose={() => setEditModalOpen(false)} />}
      </div>
    </div>
  );
}
