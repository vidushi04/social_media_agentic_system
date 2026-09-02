import React, { useState } from 'react';
import { X, Star, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
}

type Recommend = 'yes' | 'no' | 'maybe';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, userId, userEmail }) => {
  const [rating, setRating] = useState(0);
  const [mostUsefulFeature, setMostUsefulFeature] = useState('');
  const [improvementSuggestion, setImprovementSuggestion] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<Recommend | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setRating(0);
    setMostUsefulFeature('');
    setImprovementSuggestion('');
    setWouldRecommend(null);
    setError('');
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !wouldRecommend) {
      setError('Please answer all required questions.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || null,
          email: userEmail || null,
          rating,
          most_useful_feature: mostUsefulFeature,
          improvement_suggestion: improvementSuggestion,
          would_recommend: wouldRecommend,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not submit feedback.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit feedback. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <div className="modal-content" style={{ animation: 'fadeIn 0.2s ease-out', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--ink)' }}>Send feedback</h2>
          <button className="modal-close-btn" onClick={resetAndClose} type="button" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>Thanks for sharing!</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--mute)' }}>Your feedback helps us improve Trellis for every creator.</p>
            <button type="button" className="btn-primary" style={{ marginTop: '1.25rem' }} onClick={resetAndClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--body)', marginBottom: '0.5rem', fontWeight: 600 }}>
                How would you rate your overall experience? <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div className="feedback-rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="feedback-rating-btn"
                    aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    onClick={() => setRating(value)}
                  >
                    <Star size={26} fill={value <= rating ? '#e32140' : 'none'} color={value <= rating ? '#e32140' : '#c7c7c7'} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--body)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Which feature do you find most useful?
              </label>
              <input
                type="text"
                className="text-input"
                value={mostUsefulFeature}
                onChange={(e) => setMostUsefulFeature(e.target.value)}
                placeholder="e.g. AI diagnosis, micro-skill recommendations..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--body)', marginBottom: '0.5rem', fontWeight: 600 }}>
                What's one thing we could improve?
              </label>
              <textarea
                className="text-input"
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                value={improvementSuggestion}
                onChange={(e) => setImprovementSuggestion(e.target.value)}
                placeholder="Tell us what's missing or confusing..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--body)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Would you recommend Trellis to another creator? <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div className="feedback-choice-row">
                <button
                  type="button"
                  className={`feedback-choice-btn ${wouldRecommend === 'yes' ? 'active' : ''}`}
                  onClick={() => setWouldRecommend('yes')}
                >
                  <ThumbsUp size={16} /> Yes
                </button>
                <button
                  type="button"
                  className={`feedback-choice-btn ${wouldRecommend === 'maybe' ? 'active' : ''}`}
                  onClick={() => setWouldRecommend('maybe')}
                >
                  <Minus size={16} /> Maybe
                </button>
                <button
                  type="button"
                  className={`feedback-choice-btn ${wouldRecommend === 'no' ? 'active' : ''}`}
                  onClick={() => setWouldRecommend('no')}
                >
                  <ThumbsDown size={16} /> No
                </button>
              </div>
            </div>

            {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={resetAndClose}>Cancel</button>
              <button type="submit" className="onboarding-next" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
