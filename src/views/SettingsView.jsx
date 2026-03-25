import React, { useState, useEffect, useRef } from 'react';
import { Camera, Check, X, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext';
import './SettingsView.css';

export default function SettingsView() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Load current profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) {
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url || '');
        setAvatarPreview(data.avatar_url || '');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be under 3MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSave = async () => {
    if (!user) return;
    if (!username.trim()) { setError('Username cannot be empty'); return; }
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      let newAvatarUrl = avatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: username.trim(), avatar_url: newAvatarUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getInitial = () => {
    if (username) return username.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <Loader2 size={32} className="settings-spinner" />
      </div>
    );
  }

  return (
    <div className="settings-view">
      <div className="settings-container">

        {/* Header */}
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your profile and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="settings-card">
          <div className="settings-card-title">
            <User size={16} />
            <span>Profile</span>
          </div>

          {/* Avatar */}
          <div className="settings-avatar-row">
            <div className="settings-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="settings-avatar-img" />
              ) : (
                <div className="settings-avatar-placeholder">
                  <span>{getInitial()}</span>
                </div>
              )}
              <div className="settings-avatar-overlay">
                <Camera size={18} />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <div className="settings-avatar-hint">
              <p>Click to change profile picture</p>
              <span>JPG, PNG or GIF · Max 3MB</span>
            </div>
          </div>

          {/* Username */}
          <div className="settings-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={30}
              className="settings-input"
            />
            <span className="settings-char-count">{username.length}/30</span>
          </div>

          {/* Email (read only) */}
          <div className="settings-field">
            <label>Email</label>
            <input
              type="text"
              value={user?.email || ''}
              readOnly
              className="settings-input settings-input-readonly"
            />
            <span className="settings-field-hint">Email cannot be changed</span>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="settings-feedback settings-error">
            <X size={15} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="settings-feedback settings-success">
            <Check size={15} />
            <span>Profile saved successfully</span>
          </div>
        )}

        {/* Save Button */}
        <button
          className="settings-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 size={16} className="settings-spinner" /> : <Check size={16} />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>

      </div>
    </div>
  );
}
