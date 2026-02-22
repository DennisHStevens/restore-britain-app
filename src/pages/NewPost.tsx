import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchBoardBySlug, createPost, uploadBoardImage } from '../lib/boardsApi';
import { ImageUploader } from '../components/boards/ImageUploader';
import type { Board } from '../lib/boardsApi';

/**
 * NewPost — compose screen for creating a new post.
 *
 * Features:
 * - Title field with 300-char max and character counter
 * - Auto-expanding textarea for body
 * - Image attach button (max 4 images)
 * - Post button disabled until title + body are filled
 * - Shows board name in header so user knows where they're posting
 */

const MAX_TITLE_LENGTH = 300;
const MAX_IMAGES = 4;

export function NewPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Load board to verify it exists and isn't locked
  useEffect(() => {
    if (!slug) return;
    fetchBoardBySlug(slug).then((data) => {
      if (!data) {
        setError('Board not found.');
      } else if (data.is_locked) {
        setError('This board is locked. New posts cannot be created.');
      } else {
        setBoard(data);
      }
    }).catch(() => setError('Could not load board.'));
  }, [slug]);

  // Auto-expand textarea as content grows
  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value);
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto';
      bodyRef.current.style.height = bodyRef.current.scrollHeight + 'px';
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value.length <= MAX_TITLE_LENGTH) {
      setTitle(e.target.value);
    }
  }

  // Called by ImageUploader when an image is processed and uploaded
  function handleImageUploaded(url: string) {
    setImageUrls((prev) => [...prev, url]);
  }

  function handleImageRemove(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!board || !user || !title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const postId = await createPost(
        board.id,
        user.id,
        title.trim(),
        body.trim(),
        imageUrls
      );
      // Navigate to the new post
      navigate(`/boards/${slug}/${postId}`, { replace: true });
    } catch (err: any) {
      console.error('[NewPost] Failed to create post:', err);
      setError(err.message || 'Failed to create post. Please try again.');
      setSubmitting(false);
    }
  }

  function handleCancel() {
    navigate(`/boards/${slug}`);
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting;

  return (
    <div className="new-post-page">
      {/* Header with board name and actions */}
      <div className="new-post-header">
        <button className="new-post-cancel" onClick={handleCancel}>
          Cancel
        </button>
        <span className="new-post-board-name">
          {board ? `gb/${board.slug}` : '…'}
        </span>
        <button
          className="new-post-submit"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>

      {error && (
        <p className="new-post-error">{error}</p>
      )}

      {/* Title input */}
      <div className="new-post-field">
        <input
          type="text"
          className="new-post-title-input"
          placeholder="Title"
          value={title}
          onChange={handleTitleChange}
          maxLength={MAX_TITLE_LENGTH}
          autoFocus
        />
        <span className="new-post-char-count">
          {title.length}/{MAX_TITLE_LENGTH}
        </span>
      </div>

      {/* Body textarea */}
      <textarea
        ref={bodyRef}
        className="new-post-body-input"
        placeholder="What's on your mind?"
        value={body}
        onChange={handleBodyChange}
        rows={4}
      />

      {/* Image thumbnails */}
      {imageUrls.length > 0 && (
        <div className="new-post-images">
          {imageUrls.map((url, i) => (
            <div key={url} className="new-post-image-thumb">
              <img src={url} alt="" />
              <button
                className="new-post-image-remove"
                onClick={() => handleImageRemove(i)}
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Image upload button */}
      {imageUrls.length < MAX_IMAGES && user && (
        <ImageUploader
          userId={user.id}
          onUploaded={handleImageUploaded}
        />
      )}
    </div>
  );
}
