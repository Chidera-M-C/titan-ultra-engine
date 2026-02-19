import React, { useState, useEffect } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import { saveAiImage } from './lib/imageService.js';
import { db } from './lib/appwrite.js';
import { Query } from 'appwrite';

import Sidebar from './components/Sidebar/Sidebar';
import PromptBox from './components/PromptSection/PromptBox';
import ResultModal from './components/Shared/ResultModal';
import EditModal from './components/Shared/EditModal';
import ImageViewModal from './components/Shared/ImageViewModal';
import LoginModal from './components/LoginModal'; 

import ExploreView from './views/ExploreView';
import CharacterView from './views/CharacterView';
import MyImagesView from './views/MyImagesView';
import StyleView from './views/StyleView';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('explore');
  const [viewState, setViewState] = useState('gallery');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3');
  const [image, setImage] = useState(null);
  const [userGallery, setUserGallery] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credits, setCredits] = useState(0);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // THE GUARD: Wrapper function to protect actions
  const requireAuth = (action) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    action();
  };

  const loadGallery = async () => {
    if (!user) return;
    try {
      const response = await db.listDocuments(
        'main_db', 'images',
        [Query.equal('userId', user.$id), Query.orderDesc('$createdAt')]
      );
      setUserGallery(response.documents.map(doc => ({
        id: doc.$id, url: doc.imageUrl, prompt: doc.prompt
      })));
      const userDoc = await db.getDocument('main_db', 'users', user.$id);
      setCredits(userDoc.credits || 0);
    } catch (err) {
      console.error("Sync error:", err);
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
    if (credits < 2) {
      setError("Insufficient credits.");
      return;
    }
    setViewState('result');
    setLoading(true);
    // ... generation logic ...
    setLoading(false);
  };

  return (
    <div className="master-wrapper">
      <div className="app-shell">
        <Sidebar 
          activeTab={activeTab} 
          onNavigate={(tab) => {
            // Only 'explore' is public. Everything else triggers login.
            if (tab === 'explore') setActiveTab(tab);
            else requireAuth(() => setActiveTab(tab));
          }} 
          credits={credits} 
          userId={user?.$id}
        />
        
        <main className="main-content">
          <header className="top-header">
            <h1 className="aesthetic-title">AI Image Lab</h1>
            <PromptBox
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={() => requireAuth(generateImage)}
              loading={loading}
              credits={credits} 
            />
          </header>

          <div className="scrollable-area">
            {activeTab === 'explore' ? (
              <ExploreView 
                onSelectPrompt={(p) => requireAuth(() => setPrompt(p))} 
                onViewImage={(img) => {
                  setViewingImageUrl(img.url);
                  setViewImageModalOpen(true);
                }} 
                onEditImage={(img) => requireAuth(() => {
                  setEditingImage(img);
                  setEditModalOpen(true);
                })} 
              />
            ) : (
              <MyImagesView images={userGallery} />
            )}
          </div>
        </main>

        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
        {viewImageModalOpen && <ImageViewModal imageUrl={viewingImageUrl} onClose={() => setViewImageModalOpen(false)} />}
        {editModalOpen && <EditModal image={editingImage?.url} originalPrompt={editingImage?.prompt} onClose={() => setEditModalOpen(false)} />}
      </div>
    </div>
  );
}
