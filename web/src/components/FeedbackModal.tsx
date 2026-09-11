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
  const [contactEmail, setContactEmail] = useState(userEmail || '');
  const [wouldRecommend, setWouldRecommend] = useState<Recommend | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setRating(0);
    setMostUsefulFeature('');
    setImprovementSuggestion('');
    setContactEmail(userEmail || '');
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
          email: (userEmail || contactEmail).trim() || null,
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
      <div
        className="modal-content feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="feedback-modal-top">
          <button type="button" className="modal-close-btn" onClick={resetAndClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div className="feedback-modal-thanks">
            <h2 id="feedback-title" className="onboarding-title">
              Thanks for sharing!
            </h2>
            <p className="onboarding-body">
              Your feedback helps us improve Trellis for every creator.
            </p>
            <div className="onboarding-bottom">
              <button type="button" className="onboarding-next" onClick={resetAndClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="feedback-modal-form" onSubmit={handleSubmit}>
            <h2 id="feedback-title" className="onboarding-title">
              Send feedback
            </h2>

            <div>
              <label className="feedback-modal-label" htmlFor="feedback-rating">
                How would you rate your overall experience? <span className="feedback-required">*</span>
              </label>
              <div className="feedback-rating" id="feedback-rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="feedback-rating-btn"
                    aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    onClick={() => setRating(value)}
                  >
                    <Star size={26} fill={value <= rating ? '#000' : 'none'} color={value <= rating ? '#000' : '#e5e5e5'} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="feedback-modal-label" htmlFor="feedback-useful">
                Which feature do you find most useful?
              </label>
              <input
                id="feedback-useful"
                type="text"
                className="text-input"
                value={mostUsefulFeature}
                onChange={(e) => setMostUsefulFeature(e.target.value)}
                placeholder="e.g. AI diagnosis, micro-skill recommendations..."
              />
            </div>

            <div>
              <label className="feedback-modal-label" htmlFor="feedback-improve">
                What's one thing we could improve?
              </label>
              <textarea
                id="feedback-improve"
                className="text-input"
                rows={3}
                value={improvementSuggestion}
                onChange={(e) => setImprovementSuggestion(e.target.value)}
                placeholder="Tell us what's missing or confusing..."
              />
            </div>

            {!userEmail && (
              <div>
                <label className="feedback-modal-label" htmlFor="feedback-email">
                  Email (optional)
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  className="text-input"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="so we can follow up if needed"
                />
              </div>
            )}

            <div>
              <label className="feedback-modal-label">
                Would you recommend Trellis to another creator? <span className="feedback-required">*</span>
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

            {error && <p className="feedback-modal-error">{error}</p>}

            <div className="onboarding-bottom">
              <button type="button" className="onboarding-skip" onClick={resetAndClose}>
                Cancel
              </button>
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
