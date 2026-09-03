import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import illustration1 from '../assets/onboarding/illustration-1.svg';
import illustration2 from '../assets/onboarding/illustration-2.svg';
import illustration3 from '../assets/onboarding/illustration-3.svg';

export interface OnboardingStep {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  illustration: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    kicker: 'STEP 1 OF 3',
    title: 'Paste your YouTube video link',
    body: "Drop in your YouTube video’s URL and Trellis’ multi-agent pipeline gets straight to work analyzing your video.",
    cta: 'Next',
    illustration: illustration1,
  },
  {
    kicker: 'STEP 2 OF 3',
    title: 'Watch your agents in action',
    body: 'Our multi-agent pipeline reverse-engineers the psychology behind your video — live, step by step.',
    cta: 'Next',
    illustration: illustration2,
  },
  {
    kicker: 'STEP 3 OF 3',
    title: 'See your analysis, in plain language',
    body: 'No jargon — just what worked, what didn’t, and how to improve engagement by practicing what you learn.',
    cta: 'Get Started',
    illustration: illustration3,
  },
];

interface FeatureOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const FeatureOnboardingModal: React.FC<FeatureOnboardingModalProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div
        className="modal-content onboarding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-body"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="onboarding-top">
          <button type="button" className="modal-close-btn" onClick={onSkip} aria-label="Skip">
            <X size={20} />
          </button>
        </div>

        <div className="onboarding-hero">
          <img
            className="onboarding-hero-art"
            src={step.illustration}
            alt=""
            width={896}
            height={380}
          />
        </div>

        <div className="onboarding-copy">
          <p className="onboarding-kicker">{step.kicker}</p>
          <h2 id="onboarding-title" className="onboarding-title">
            {step.title}
          </h2>
          <p id="onboarding-body" className="onboarding-body">
            {step.body}
          </p>
        </div>

        <div className="onboarding-bottom">
          <div className="onboarding-dots" role="tablist" aria-label="Onboarding steps">
            {ONBOARDING_STEPS.map((item, index) => (
              <button
                key={item.kicker}
                type="button"
                role="tab"
                className={`onboarding-dot${index === stepIndex ? ' active' : ''}`}
                aria-label={`Go to ${item.kicker.toLowerCase()}`}
                aria-selected={index === stepIndex}
                onClick={() => setStepIndex(index)}
              />
            ))}
          </div>
          <button type="button" className="onboarding-next" onClick={handleNext}>
            {step.cta}
          </button>
        </div>
      </div>
    </div>
  );
};
