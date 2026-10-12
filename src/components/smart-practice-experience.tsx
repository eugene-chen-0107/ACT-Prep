'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BrainCircuit, Clock3, LoaderCircle, RefreshCw, Sparkles, Target } from 'lucide-react';
import type { StudentSmartPracticePlan } from '@/lib/smart-practice-engine';
import { SMART_CUSTOM_MAX_MINUTES, SMART_CUSTOM_MINUTES, SMART_SESSION_PRESETS } from '@/lib/smart-practice-engine';
import { useSearchParams } from 'next/navigation';

type PlanResponse = { plan?: StudentSmartPracticePlan; error?: string };
const presetLabels: Record<number, string> = { 5: 'Quick', 10: 'Focused', 20: 'Deep focus', 30: 'Full session' };

export function SmartPracticeExperience() {
  const searchParams = useSearchParams();
  const targetSection = searchParams.get('section') ?? '';
  const targetTopic = searchParams.get('topic') ?? '';
  const [duration, setDuration] = useState<number>(Number(searchParams.get('minutes')) || 10);
  const [customDuration, setCustomDuration] = useState('15');
  const [customSelected, setCustomSelected] = useState(false);
  const [plan, setPlan] = useState<StudentSmartPracticePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPlan = useCallback(async (minutes: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ minutes: String(minutes) });
      if (targetSection) params.set('section', targetSection);
      if (targetTopic) params.set('topic', targetTopic);
      const response = await fetch(`/api/student/smart-practice?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as PlanResponse;
      if (!response.ok || !payload.plan) throw new Error(payload.error ?? 'A Smart Practice session could not be made.');
      setPlan(payload.plan);
    } catch (cause) {
      setPlan(null);
      setError(cause instanceof Error ? cause.message : 'A Smart Practice session could not be made.');
    } finally {
      setLoading(false);
    }
  }, [targetSection, targetTopic]);

  useEffect(() => { void loadPlan(duration); }, [duration, loadPlan]);

  function selectDuration(minutes: number) {
    setCustomSelected(false);
    setDuration(minutes);
  }

  function startCustom() {
    const parsed = Number(customDuration);
    if (!Number.isInteger(parsed) || parsed < SMART_CUSTOM_MINUTES || parsed > SMART_CUSTOM_MAX_MINUTES) {
      setCustomSelected(true);
      setError(`Enter a whole number from ${SMART_CUSTOM_MINUTES} to ${SMART_CUSTOM_MAX_MINUTES}.`);
      return;
    }
    setCustomSelected(true);
    setDuration(parsed);
  }

  return <main className="smart-page">
    <header className="smart-heading"><span className="smart-heading-mark"><BrainCircuit size={20} /></span><div><p className="smart-eyebrow">A PRACTICE PLAN, WITHOUT THE GUESSWORK</p><h2>Smart Practice</h2><p>{targetTopic ? `Focused on ${targetTopic}${targetSection ? ` · ${targetSection}` : ''}. ` : ''}We choose the next question from your results. Just pick the time you have.</p></div></header>

    <section className="smart-duration-card" aria-labelledby="smart-duration-title">
      <div className="smart-card-heading"><div><span className="smart-eyebrow">YOUR SESSION</span><h3 id="smart-duration-title">How much time do you have?</h3></div><span className="smart-time-icon"><Clock3 size={17} /></span></div>
      <div className="smart-duration-options" role="group" aria-label="Practice session length">
        {SMART_SESSION_PRESETS.map((minutes) => <button type="button" key={minutes} aria-pressed={!customSelected && duration === minutes} className={`smart-duration-option${!customSelected && duration === minutes ? ' is-selected' : ''}`} onClick={() => selectDuration(minutes)}><strong>{minutes}<small> min</small></strong><span>{presetLabels[minutes]}</span></button>)}
        <div className={`smart-duration-option smart-custom-option${customSelected ? ' is-selected' : ''}`}>
          <label htmlFor="smart-custom-minutes">Custom</label><div><input id="smart-custom-minutes" type="number" inputMode="numeric" min={SMART_CUSTOM_MINUTES} max={SMART_CUSTOM_MAX_MINUTES} value={customDuration} onChange={(event) => setCustomDuration(event.target.value)} aria-label="Custom practice session minutes" /><span>min</span></div><button type="button" onClick={startCustom}>Use time</button>
        </div>
      </div>
    </section>

    <section className="smart-plan-card" aria-labelledby="smart-plan-title" aria-live="polite">
      <div className="smart-card-heading smart-plan-heading"><div><span className="smart-eyebrow"><Sparkles size={12} /> YOUR SESSION PLAN</span><h3 id="smart-plan-title">Recommended questions</h3></div><button className="smart-refresh" type="button" onClick={() => void loadPlan(duration)} disabled={loading} aria-label="Refresh recommendations">{loading ? <LoaderCircle size={16} className="smart-spin" /> : <RefreshCw size={15} />}</button></div>
      {loading ? <div className="smart-loading"><LoaderCircle className="smart-spin" size={20} />Finding a good next question…</div> : error ? <p className="smart-error" role="alert">{error}</p> : !plan?.recommendations.length ? <div className="smart-empty"><Target size={20} /><strong>No questions are available yet</strong><span>Once published questions are available, Smart Practice can build your session.</span></div> : <>
        <p className="smart-plan-summary">{plan.summary}</p>
        <ol className="smart-question-list">{plan.recommendations.map((item, index) => <li key={item.question.id}>
          <span className="smart-question-index">{String(index + 1).padStart(2, '0')}</span><span className="smart-question-main"><strong>{item.question.topic}</strong><small>{item.question.section} · {item.question.difficulty} · {item.reason}</small></span><span className="smart-question-score" title="Deterministic recommendation score">{item.recommendationScore.toFixed(1)}</span>
        </li>)}</ol>
        <div className="smart-plan-footer"><span><Clock3 size={14} />{plan.estimatedQuestionCount} questions · about {plan.estimatedMinutes} min</span><Link href={`/practice?mode=smart&minutes=${plan.durationMinutes}&ids=${encodeURIComponent(plan.recommendations.map(({ question }) => question.id).join(','))}`}>Start Smart Practice <ArrowRight size={15} /></Link></div>
      </>}
    </section>

    <aside className="smart-method-note"><strong>How recommendations work</strong><span>We balance skill accuracy and recent mistakes with spacing, response time, target urgency, question variety, and difficulty progression. Questions are selected from the same provider interface as regular practice, ready for future AI-generated content.</span></aside>
    <div className="smart-footer-link"><Link href="/practice">Prefer to choose a topic yourself? Practice by section <ArrowRight size={13} /></Link></div>
  </main>;
}
