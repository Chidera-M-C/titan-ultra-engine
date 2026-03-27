import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext';
import './ImageViewModal.css';

// ── Time helper ──────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  return `${days}d ago`;
}

// ── Avatar helper ────────────────────────────────────────────────────────────
function UserAvatar({ profile, size = 32 }) {
  const initial = profile?.username?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U';
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt={initial} className="ivm-avatar-img" style={{ width: size, height: size }} />
  ) : (
    <div className="ivm-avatar-placeholder" style={{ width: size, height: size }}>
      {initial}
    </div>
  );
}

// ── Single Comment ───────────────────────────────────────────────────────────
function Comment({ comment, imageOwnerId, depth = 0 }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(comment.liked || false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState(comment.replies || []);
  const [submitting, setSubmitting] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;

    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : Math.max(0, likes - 1);

    // Optimistic update
    setLiked(newLiked);
    setLikes(newLikes);

    try {
      if (newLiked) {
        await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: user.id });
        await supabase.from('comments').update({ likes: newLikes }).eq('id', comment.id);
      } else {
        await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', user.id);
        await supabase.from('comments').update({ likes: newLikes }).eq('id', comment.id);
      }
    } catch (err) {
      console.error('Comment like failed:', err);
      // Revert optimistic update
      setLiked(!newLiked);
      setLikes(likes);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim() || submitting || !user) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('comments')
      .insert({ image_id: comment.image_id, user_id: user.id, parent_id: comment.id, content: replyText.trim() })
      .select('*, profile:profiles!user_id(username, avatar_url)')
      .single();

    if (error) {
      console.error('Supabase reply insert error:', error);
    } else if (data) {
      setReplies(prev => [...prev, { ...data, liked: false, likes: 0, replies: [] }]);
      setShowReplies(true);
      setReplyText('');
      setReplying(false);

      // Notify image owner if it's not themselves
      if (imageOwnerId && imageOwnerId !== user.id) {
        await supabase.from('notifications').insert({
          user_id: imageOwnerId,
          type: 'comment',
          title: 'New reply on your image',
          message: `${data.profile?.username || 'Someone'} replied: "${replyText.trim().slice(0, 60)}"`,
          image_id: comment.image_id,
        });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className={`ivm-comment ${depth > 0 ? 'ivm-reply' : ''}`}>
      <UserAvatar profile={comment.profile} size={depth > 0 ? 26 : 32} />
      <div className="ivm-comment-body">
        <div className="ivm-comment-header">
          <span className="ivm-comment-name">{comment.profile?.username || 'User'}</span>
          <span className="ivm-comment-time">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="ivm-comment-text">{comment.content}</p>
        <div className="ivm-comment-actions">
          <button className={`ivm-comment-like ${liked ? 'liked' : ''}`} onClick={handleLike}>
            <Heart size={12} fill={liked ? '#ff4b4b' : 'none'} color={liked ? '#ff4b4b' : '#666'} />
            <span>{likes > 0 ? likes : ''}</span>
          </button>
          {user && depth === 0 && (
            <button className="ivm-comment-reply-btn" onClick={() => setReplying(r => !r)}>
              Reply
            </button>
          )}
          {replies.length > 0 && depth === 0 && (
            <button className="ivm-toggle-replies" onClick={() => setShowReplies(r => !r)}>
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {replying && (
          <div className="ivm-reply-input-row">
            <UserAvatar profile={null} size={24} />
            <input
              className="ivm-reply-input"
              placeholder="Write a reply..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReplySubmit()}
              autoFocus
            />
            <button className="ivm-send-btn" onClick={handleReplySubmit} disabled={!replyText.trim() || submitting}>
              <Send size={13} />
            </button>
          </div>
        )}

        {showReplies && replies.length > 0 && (
          <div className="ivm-replies">
            {replies.map(reply => (
              <Comment key={reply.id} comment={reply} imageOwnerId={imageOwnerId} depth={1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function ImageViewModal({ imageUrl, imageId, imageOwnerId, onClose }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const commentInputRef = useRef(null);

  // Fetch likes and comments
  useEffect(() => {
    if (!imageId) return;

    const fetchData = async () => {
      setLoadingComments(true);

      try {
        // Fetch image likes count
        const { data: imgData } = await supabase
          .from('images')
          .select('likes')
          .eq('id', imageId)
          .single();
        if (imgData) setLikes(imgData.likes || 0);

        // Check if current user liked this image
        if (user) {
          const { data: likeData } = await supabase
            .from('image_likes')
            .select('id')
            .eq('image_id', imageId)
            .eq('user_id', user.id)
            .maybeSingle();
          setLiked(!!likeData);
        }

        // Fetch top-level comments with profiles
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*, profile:profiles!user_id(username, avatar_url)')
          .eq('image_id', imageId)
          .is('parent_id', null)
          .order('created_at', { ascending: false });

        if (commentsError) {
          console.error('Comments fetch error:', commentsError);
        }

        if (commentsData) {
          // Fetch replies for each comment
          const commentsWithReplies = await Promise.all(
            commentsData.map(async (c) => {
              const { data: repliesData, error: repliesError } = await supabase
                .from('comments')
                .select('*, profile:profiles!user_id(username, avatar_url)')
                .eq('parent_id', c.id)
                .order('created_at', { ascending: true });

              if (repliesError) console.error('Replies fetch error:', repliesError);

              // Check liked status for each comment + replies
              let commentLiked = false;
              let replyLiked = {};
              if (user) {
                const commentIds = [c.id, ...(repliesData || []).map(r => r.id)];
                const { data: cl } = await supabase
                  .from('comment_likes')
                  .select('comment_id')
                  .eq('user_id', user.id)
                  .in('comment_id', commentIds);
                const likedIds = new Set((cl || []).map(l => l.comment_id));
                commentLiked = likedIds.has(c.id);
                replyLiked = Object.fromEntries((repliesData || []).map(r => [r.id, likedIds.has(r.id)]));
              }

              return {
                ...c,
                liked: commentLiked,
                replies: (repliesData || []).map(r => ({ ...r, liked: replyLiked[r.id] || false, replies: [] })),
              };
            })
          );
          setComments(commentsWithReplies);
        }
      } catch (err) {
        console.error('Error loading comments/likes:', err);
      } finally {
        setLoadingComments(false);
      }
    };

    fetchData();
  }, [imageId, user]);

  const handleLikeImage = async () => {
    if (!user) return;
    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : Math.max(0, likes - 1);

    setLiked(newLiked);
    setLikes(newLikes);

    try {
      if (newLiked) {
        await supabase.from('image_likes').insert({ user_id: user.id, image_id: imageId });
        await supabase.from('images').update({ likes: newLikes }).eq('id', imageId);
        if (imageOwnerId && imageOwnerId !== user.id) {
          await supabase.from('notifications').insert({
            user_id: imageOwnerId,
            type: 'like',
            title: 'Someone liked your image',
            message: 'Your image just got a like!',
            image_id: imageId,
          });
        }
      } else {
        await supabase.from('image_likes').delete().eq('user_id', user.id).eq('image_id', imageId);
        await supabase.from('images').update({ likes: newLikes }).eq('id', imageId);
      }
    } catch (err) {
      console.error('Image like failed:', err);
      setLiked(!newLiked);
      setLikes(likes);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || submitting || !user) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('comments')
      .insert({ image_id: imageId, user_id: user.id, content: commentText.trim() })
      .select('*, profile:profiles!user_id(username, avatar_url)')
      .single();

    if (error) {
      console.error('Supabase comment insert error:', error);
    } else if (data) {
      setComments(prev => [{ ...data, liked: false, likes: 0, replies: [] }, ...prev]);
      setCommentText('');

      // Notify owner
      if (imageOwnerId && imageOwnerId !== user.id) {
        await supabase.from('notifications').insert({
          user_id: imageOwnerId,
          type: 'comment',
          title: 'New comment on your image',
          message: `${data.profile?.username || 'Someone'} commented: "${commentText.trim().slice(0, 60)}"`,
          image_id: imageId,
        });
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="image-view-modal" onClick={onClose}>
      <div className="image-view-content" onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button className="image-view-close" onClick={onClose}><X size={18} /></button>

        {/* Left — Image */}
        <div className="ivm-image-side">
          <img src={imageUrl} alt="Full view" className="image-view-img" />
        </div>

        {/* Right — Sidebar */}
        <div className="ivm-sidebar">

          {/* Likes bar */}
          <div className="ivm-likes-bar">
            <button className={`ivm-like-btn ${liked ? 'liked' : ''}`} onClick={handleLikeImage}>
              <Heart size={18} fill={liked ? '#ff4b4b' : 'none'} color={liked ? '#ff4b4b' : '#fff'} />
              <span>{likes} {likes === 1 ? 'like' : 'likes'}</span>
            </button>
          </div>

          {/* Comments list */}
          <div className="ivm-comments-list">
            {loadingComments ? (
              <div className="ivm-comments-loading">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="ivm-comments-empty">No comments yet. Be the first!</div>
            ) : (
              comments.map(c => (
                <Comment key={c.id} comment={c} imageOwnerId={imageOwnerId} depth={0} />
              ))
            )}
          </div>

          {/* Comment input */}
          {user ? (
            <div className="ivm-comment-input-row">
              <input
                ref={commentInputRef}
                className="ivm-comment-input"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCommentSubmit()}
              />
              <button
                className="ivm-send-btn"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || submitting}
              >
                <Send size={15} />
              </button>
            </div>
          ) : (
            <div className="ivm-login-hint">Sign in to like and comment</div>
          )}
        </div>
      </div>
    </div>
  );
}
