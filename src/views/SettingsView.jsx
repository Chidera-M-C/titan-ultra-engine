import React, { useState, useEffect, useRef } from 'react';
import { Camera, Check, X, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext';
import './SettingsView.css';

export default function SettingsView() {
  const { user, setProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('username, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setUsername(data.username || '');
          setAvatarUrl(data.avatar_url || '');
          setAvatarPreview(data.avatar_url || '');
        } else {
          setUsername('');
          setAvatarUrl('');
          setAvatarPreview('');
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
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

    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      let newAvatarUrl = avatarUrl;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, {
            upsert: true,
            contentType: avatarFile.type || `image/${ext}`,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);

        newAvatarUrl = urlData.publicUrl;
      }

      const payload = {
        id: user.id,
        username: username.trim(),
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { data: existingUser, error: existingError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: payload.username,
            avatar_url: payload.avatar_url,
            updated_at: payload.updated_at,
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('users')
          .insert(payload);

        if (insertError) throw insertError;
      }

      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setProfile?.({
        username: payload.username,
        avatar_url: newAvatarUrl,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed full error:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        raw: err,
      });
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
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your profile and preferences</p>
        </div>

        <div className="settings-card">
          <div className="settings-card-title">
            <User size={16} />
            <span>Profile</span>
          </div>

          <div
            className="settings-avatar-row"
          >
            <div
              className="settings-avatar-wrap"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="settings-avatar-img"
                />
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

          <div className="settings-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={30}
              className="settings-input"
            />
            <span className="settings-char-count">{username.length}/30</span>
          </div>

          <div className="settings-field">
            <label>Email</label>
            <input
              type="text"
              value={user?.email || ''}
              readOnly
              className="settings-input settings-input-readonly"
            />
            <span className="settings-field-hint">
              Email cannot be changed
            </span>
          </div>
        </div>

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

        <button
          className="settings-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 size={16} className="settings-spinner" />
          ) : (
            <Check size={16} />
          )}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
