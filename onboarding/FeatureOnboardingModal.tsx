/**
 * REFERENCE ONLY — not imported by the live app.
 *
 * Move this file to web/src/components/ during implementation and
 * replace illustration placeholders with downloaded Figma assets.
 * Styles for .onboarding-* are specified in IMPLEMENTATION_PLAN.md
 * and should be added to web/src/index.css at that time.
 *
 * Figma: https://www.figma.com/design/R3z5RUZioy9huR93RwPtRv/Trellis
 *   Step 1  node 1:132
 *   Step 2  node 1:165
 *   Step 3  node 1:221
 */

import React, { useEffect, useState } from 'react';

export type OnboardingStatus = 'pending' | 'completed' | 'skipped';

export interface OnboardingStep {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  visual: 'paste-link' | 'agents' | 'analysis';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    kicker: 'STEP 1 OF 3',
    title: 'Paste your YouTube video link',
    body: "Drop in your YouTube video’s URL and Trellis’ multi-agent pipeline gets straight to work analyzing your video.",
    cta: 'Next',
    visual: 'paste-link',
  },
  {
    kicker: 'STEP 2 OF 3',
    title: 'Watch your agents in action',
    body: 'Our multi-agent pipeline reverse-engineers the psychology behind your video — live, step by step.',
    cta: 'Next',
    visual: 'agents',
  },
  {
    kicker: 'STEP 3 OF 3',
    title: 'See your analysis, in plain language',
    body: 'No jargon — just what worked, what didn’t, and how to improve engagement by practicing what you learn.',
    cta: 'Get Started',
    visual: 'analysis',
  },
];

interface FeatureOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const StepIllustration: React.FC<{ visual: OnboardingStep['visual'] }> = ({ visual }) => {
  if (visual === 'paste-link') {
    return (
      <div className="onboarding-illustration" data-figma-node="1:133">
        {/* TODO: Figma thumbnail + prompt-card composite */}
        <div className="onboarding-fig-prompt">
          <p className="onboarding-fig-url">https://www.youtube.com/watch?v=</p>
          <span className="onboarding-fig-run">Run Analysis</span>
        </div>
        <p className="onboarding-fig-disclaimer">
          AI can make mistakes. Please double check. Use discretion before you create or use ideas.{' '}
          <span>Learn more</span>
        </p>
      </div>
    );
  }

  if (visual === 'agents') {
    return (
      <div className="onboarding-illustration" data-figma-node="1:168">
        {/* TODO: three tilted agent cards from Figma exports */}
        <p>I do math for you</p>
        <p>I read your audience’s mind for you</p>
        <p>I am your favourite coach</p>
      </div>
    );
  }

  return (
    <div className="onboarding-illustration" data-figma-node="1:224">
      {/* TODO: AI diagnosis + Trellis recommends cards */}
      <p>AI diagnosis</p>
      <p>Your intro loses 40% of viewers before second 5 — the hook needs a stronger question up front.</p>
      <p>Trellis recommends</p>
      <p>Frame your finding as a question</p>
      <span>In simple language</span>
    </div>
  );
};

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
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="onboarding-skip-top" onClick={onSkip}>
          Skip
        </button>

        <StepIllustration visual={step.visual} />

        <p className="onboarding-kicker">{step.kicker}</p>
        <h2 id="onboarding-title" className="onboarding-title">
          {step.title}
        </h2>
        <p className="onboarding-body">{step.body}</p>

        <div className="onboarding-bottom">
          <div className="onboarding-dots" aria-hidden="true">
            {ONBOARDING_STEPS.map((item, index) => (
              <span
                key={item.kicker}
                className={`onboarding-dot${index === stepIndex ? ' active' : ''}`}
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
