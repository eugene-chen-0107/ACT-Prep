'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bookmark, Check, CheckCircle2, Clock3, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { StudentPracticeQuestion } from '@/lib/practice-flow';

type TestCard = { id: string; slug: string; version: number; title: string; description: string | null; durationSeconds: number; sections: Array<{ sectionId: string; durationSeconds: number; instructions: string }>; questionCount: number; sectionCounts: Record<string, number> };
type Section = { sectionId: string; sectionName: string; durationSeconds: number; instructions: string; questionCount: number; answeredCount: number; flaggedCount: number; questions: StudentPracticeQuestion[] };
type Result = { totalQuestions: number; answeredQuestions: number; correct: number; rawScore: number; accuracy: number; sectionScores: Record<string, { correct: number; total: number; accuracy: number }>; answerReview: Array<{ questionId: string; sectionId: string; selectedAnswer: string | null; correctAnswer: string; isCorrect: boolean; explanation: string }> };
type Attempt = { attemptId: string; status: string; testTitle: string; testVersion: number; phase: 'overview' | 'instructions' | 'in_progress' | 'section_transition' | 'completed'; activeSectionIndex: number; activeQuestionIndex: number; sectionDeadlineAt: string | null; remainingSeconds: number; sections: Section[]; answers: Record<string, string | null>; flags: Record<string, boolean>; result: Result | null };
type Props = { initialTests: TestCard[]; activeAttempts?: Array<{ id: string; title: string; testId: string; startedAt: string }> };

function durationLabel(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}
function formatClock(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
async function readError(response: Response) { const body = await response.json().catch(() => null) as { error?: string } | null; return body?.error ?? 'Something went wrong. Please try again.'; }

export function PracticeTestExperience({ initialTests, activeAttempts = [] }: Props) {
  const [tests] = useState(initialTests);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [finishSectionConfirm, setFinishSectionConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAttempt = useCallback(async (id: string) => {
    setLoading(true); setError('');
    try { const response = await fetch(`/api/student/tests?attemptId=${encodeURIComponent(id)}`, { cache: 'no-store' }); if (!response.ok) throw new Error(await readError(response)); const loaded = await response.json() as Attempt; setAttempt(loaded); if (loaded.phase === 'in_progress') setClock(loaded.remainingSeconds); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load your test.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const id = new URLSearchParams(window.location.search).get('attempt'); if (id) void loadAttempt(id); }, [loadAttempt]);
  const activeDeadline = attempt?.sectionDeadlineAt;
  const activePhase = attempt?.phase;
  useEffect(() => {
    if (activePhase !== 'in_progress' || !activeDeadline) return;
    const tick = () => setClock(Math.max(0, Math.ceil((new Date(activeDeadline).getTime() - Date.now()) / 1000)));
    tick(); const timer = window.setInterval(tick, 250); return () => window.clearInterval(timer);
  }, [activeDeadline, activePhase]);

  const mutate = useCallback(async (body: Record<string, unknown>) => {
    if (!attempt) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/student/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attemptId: attempt.attemptId, ...body }) });
      if (!response.ok) throw new Error(await readError(response));
      const next = await response.json() as Attempt; setAttempt(next);
      if (body.action === 'submit') { window.history.replaceState(null, '', `/tests?attempt=${encodeURIComponent(next.attemptId)}`); setConfirmSubmit(false); }
      if (next.phase === 'in_progress') setClock(next.remainingSeconds);
      if (next.phase === 'completed') setConfirmSubmit(false);
      if (next.phase === 'section_transition' && body.action === 'finishSection') setFinishSectionConfirm(false);
      return next;
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save your progress.'); throw caught; }
    finally { setSaving(false); }
  }, [attempt]);

  const activeAttemptId = attempt?.attemptId;
  const isInProgress = attempt?.phase === 'in_progress';
  useEffect(() => {
    if (!activeAttemptId || !isInProgress || clock > 0 || saving) return;
    void mutate({ action: 'expire' }).catch(() => undefined);
  }, [activeAttemptId, isInProgress, clock, saving, mutate]);

  const begin = async (test: TestCard) => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/student/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testId: test.id }) });
      if (!response.ok) throw new Error(await readError(response));
      const next = await response.json() as Attempt; setAttempt(next); window.history.replaceState(null, '', `/tests?attempt=${encodeURIComponent(next.attemptId)}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start this test.'); }
    finally { setLoading(false); }
  };

  const persistedRemaining = attempt?.remainingSeconds;
  useEffect(() => { if (isInProgress && persistedRemaining !== undefined) setClock(persistedRemaining); }, [persistedRemaining, isInProgress]);
  useEffect(() => {
    const onPopState = () => {
      const id = new URLSearchParams(window.location.search).get('attempt');
      if (id) void loadAttempt(id);
      else setAttempt(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadAttempt]);

  const activeSection = attempt?.sections[attempt.activeSectionIndex];
  const section = activeSection;
  const sectionIndex = attempt?.activeSectionIndex ?? 0;
  const question = section?.questions[attempt?.activeQuestionIndex ?? 0];
  const sectionAnswered = section?.answeredCount ?? 0;

  if (loading && !attempt) return <div className="test-page"><div className="test-state"><LoaderCircle className="test-spin" size={22} /> Loading your test…</div></div>;
  if (error && !attempt) return <div className="test-page"><div className="test-state test-state--error"><strong>Couldn’t open tests</strong><span>{error}</span><button className="test-button test-button--secondary" onClick={() => window.location.reload()}>Try again</button></div></div>;
  if (!attempt) return <div className="test-page">
    <div className="test-page-heading"><div><p className="test-eyebrow">FOCUSED PRACTICE</p><h2>Practice tests</h2><p className="test-muted">Choose an original test. Your answers are saved as you go.</p></div><span className="test-content-note"><ShieldCheck size={15} /> Original practice content</span></div>
    {activeAttempts.length > 0 && <section className="test-resume-panel"><div><strong>Pick up where you left off</strong><span>Your active attempts are saved securely.</span></div>{activeAttempts.map((active) => <button key={active.id} className="test-resume-item" onClick={() => { window.history.replaceState(null, '', `/tests?attempt=${encodeURIComponent(active.id)}`); void loadAttempt(active.id); }}><span><strong>{active.title}</strong><small>Started {new Date(active.startedAt).toLocaleDateString()}</small></span><span>Resume <ArrowRight size={14} /></span></button>)}</section>}
    {error && <p className="test-error" role="alert">{error}</p>}
    {tests.length ? <div className="test-catalog">{tests.map((test) => <article className="test-card" key={test.id}><div className="test-card-top"><span className="test-kicker">VERSION {test.version}</span><span className="test-card-time"><Clock3 size={14} />{durationLabel(test.durationSeconds)}</span></div><h3>{test.title}</h3><p>{test.description ?? 'A timed practice test with saved progress and detailed section results.'}</p><div className="test-section-chips">{test.sections.map((part) => <span key={part.sectionId}>{part.sectionId} · {test.sectionCounts[part.sectionId] ?? 0} Q</span>)}</div><div className="test-card-bottom"><span>{test.questionCount} questions · {test.sections.length} sections</span><button className="test-button test-button--primary" disabled={loading} onClick={() => void begin(test)}>Start test <ArrowRight size={15} /></button></div></article>)}</div> : <div className="test-empty"><span className="test-empty-mark"><CheckCircle2 size={21} /></span><strong>No tests available yet</strong><p>Published original tests will appear here when they’re ready.</p></div>}
    {loading && <div className="test-loading-shade"><LoaderCircle className="test-spin" size={23} /> Starting securely…</div>}
  </div>;

  if (attempt.status === 'completed' && attempt.result) return <div className="test-page test-results"><Link href="/tests" className="test-back-link"><ArrowLeft size={15} /> All tests</Link><p className="test-eyebrow">TEST COMPLETE</p><h2>{attempt.testTitle}</h2><section className="test-result-hero"><span>Raw score</span><strong>{attempt.result.correct}<small> / {attempt.result.totalQuestions}</small></strong><p>{attempt.result.accuracy}% accuracy · {attempt.result.answeredQuestions} answered</p><p className="test-result-caveat">This is practice accuracy, not an official ACT scaled score.</p></section><h3 className="test-results-title">Section results</h3><div className="test-result-sections">{Object.entries(attempt.result.sectionScores).map(([name, score]) => <article key={name}><span>{name}</span><strong>{score.accuracy}%</strong><small className="test-section-score-count">{score.correct} / {score.total} correct</small><div className="test-result-track"><span style={{ width: `${score.accuracy}%` }} /></div></article>)}</div><h3 className="test-results-title">Answer review</h3><div className="test-answer-review">{attempt.result.answerReview.map((item, index) => { const question = attempt.sections.flatMap((testSection) => testSection.questions).find(({ id }) => id === item.questionId); return <article key={item.questionId}><div><strong>Question {index + 1}</strong><span className={item.isCorrect ? 'is-correct' : 'is-incorrect'}>{item.isCorrect ? 'Correct' : item.selectedAnswer ? 'Incorrect' : 'Unanswered'}</span></div>{question && <p>{question.question}</p>}<p className="test-answer-detail">Your answer: {item.selectedAnswer ?? 'No answer'} · Correct answer: {item.correctAnswer}</p><p className="test-answer-explanation">{item.explanation}</p></article>; })}</div><div className="test-results-actions"><Link href="/practice" className="test-button test-button--secondary">Practice a section</Link><Link href="/progress" className="test-button test-button--primary">View my progress <ArrowRight size={15} /></Link></div></div>;

  if (attempt.phase === 'overview') return <div className="test-focus"><div className="test-overview"><Link href="/tests" className="test-back-link"><ArrowLeft size={15} /> Exit to tests</Link><p className="test-eyebrow">TEST OVERVIEW</p><h1>{attempt.testTitle}</h1><p className="test-overview-lede">Your progress is saved automatically. If you leave and return, this attempt will resume with the time remaining.</p><div className="test-overview-stats"><span><Clock3 size={17} />{durationLabel(attempt.sections.reduce((sum, item) => sum + item.durationSeconds, 0))} total</span><span>{attempt.sections.reduce((sum, item) => sum + item.questionCount, 0)} questions</span><span>{attempt.sections.length} timed sections</span></div>        <div className="test-overview-sections">{attempt.sections.map((item) => <div key={item.sectionId}><span>{item.sectionName}</span><span>{item.questionCount} questions · {durationLabel(item.durationSeconds)}</span></div>)}</div><p className="test-honor"><ShieldCheck size={17} /> Take the test in one sitting for the most realistic practice. Each section has its own timer.</p><button className="test-button test-button--primary test-button--wide" disabled={saving} onClick={() => void mutate({ action: 'begin' }).catch(() => undefined)}>Review instructions <ArrowRight size={16} /></button>{error && <p className="test-error" role="alert">{error}</p>}</div></div>;

  if (attempt.phase === 'instructions' || attempt.phase === 'section_transition') {
    const current = attempt.sections[attempt.activeSectionIndex];
    const isTransition = attempt.phase === 'section_transition';
    const final = attempt.activeSectionIndex === attempt.sections.length - 1;
    return <div className="test-focus"><div className="test-instructions"><span className="test-step-count">SECTION {attempt.activeSectionIndex + 1} OF {attempt.sections.length}</span><p className="test-eyebrow">{isTransition ? 'SECTION COMPLETE' : 'BEFORE YOU BEGIN'}</p><h1>{isTransition ? (final ? 'Ready to finish?' : 'Take a breath.') : current.sectionName}</h1>{!isTransition && <p className="test-instructions-copy">{current.instructions}</p>}{isTransition && <p className="test-instructions-copy">{final ? 'You’ve reached the end of the test. Submit when you’re ready to see your results.' : `The ${current.sectionName} section is complete. Your answers are saved. The next section has a separate timer.`}</p>}<div className="test-instruction-rule" /><div className="test-instructions-meta"><span><Clock3 size={16} />{durationLabel(current.durationSeconds)}{isTransition ? ' completed' : ' for this section'}</span><span>{current.questionCount} questions</span>{isTransition && <span>{current.answeredCount} answered · {current.questionCount - current.answeredCount} unanswered</span>}</div><div className="test-instruction-actions"><Link href="/tests" className="test-button test-button--secondary">Save and exit</Link>{isTransition && final ? <button className="test-button test-button--primary" onClick={() => setConfirmSubmit(true)}>Review &amp; submit <ArrowRight size={15} /></button> : <button className="test-button test-button--primary" disabled={saving} onClick={() => void mutate({ action: 'continue' }).catch(() => undefined)}>{isTransition ? `Begin ${attempt.sections[attempt.activeSectionIndex + 1]?.sectionName}` : 'Begin section'} <ArrowRight size={15} /></button>}</div>{error && <p className="test-error" role="alert">{error}</p>}</div>{confirmSubmit && <SubmitDialog attempt={attempt} onCancel={() => setConfirmSubmit(false)} onSubmit={() => void mutate({ action: 'submit' }).catch(() => undefined)} saving={saving} />}</div>;
  }

  if (!section || !question || sectionIndex !== attempt.activeSectionIndex) return <div className="test-state test-state--error">Test content could not be loaded. <Link href="/tests">Return to tests</Link></div>;
  const flagged = Boolean(attempt.flags[question.id]);
  const showSubmitReview = confirmSubmit;
  return <div className="test-focus test-taking">
    <header className="test-bar"><Link href="/tests" className="test-mark">N<span>.</span></Link><div className="test-bar-section"><span>SECTION {attempt.activeSectionIndex + 1} OF {attempt.sections.length}</span><strong>{section.sectionName}</strong></div><div className={`test-timer${clock < 60 ? ' is-low' : ''}`} aria-live="polite"><Clock3 size={16} /><span>{formatClock(clock)}</span><small>remaining</small></div><button className="test-exit-button" onClick={() => { window.history.replaceState(null, '', '/tests'); setAttempt(null); }}>Exit test</button></header>
    <div className="test-taking-layout"><main className="test-question-area"><div className="test-question-progress"><span>Question {attempt.activeQuestionIndex + 1} <small>of {section.questionCount}</small></span><span>{sectionAnswered} answered</span></div><div className="test-progress-track"><span style={{ width: `${(attempt.activeQuestionIndex + 1) / section.questionCount * 100}%` }} /></div><div className="test-question-topline"><span>{question.topic}</span><button className={`test-flag${flagged ? ' is-flagged' : ''}`} disabled={saving} aria-pressed={flagged} onClick={() => void mutate({ action: 'flag', questionId: question.id, flagged: !flagged }).catch(() => undefined)}><Bookmark size={15} fill={flagged ? 'currentColor' : 'none'} />{flagged ? 'Flagged' : 'Flag for review'}</button></div><article className="test-question-card"><h1>{question.question}</h1>{question.passage && <div className="test-passage"><span>PASSAGE</span><p>{question.passage}</p></div>}<fieldset className="test-choices"><legend className="test-sr-only">Choose one answer</legend>{question.choices.map((choice) => <label key={choice.id} className={`test-choice${attempt.answers[question.id] === choice.id ? ' is-selected' : ''}`}><input type="radio" name={`answer-${question.id}`} checked={attempt.answers[question.id] === choice.id} disabled={saving || clock === 0} onChange={() => void mutate({ action: 'answer', questionId: question.id, selectedAnswer: choice.id }).catch(() => undefined)} /><span className="test-choice-letter">{choice.id}</span><span>{choice.text}</span>{attempt.answers[question.id] === choice.id && <Check size={16} />}</label>)}</fieldset></article><div className="test-question-actions"><button className="test-button test-button--secondary" disabled={attempt.activeQuestionIndex === 0 || saving} onClick={() => void mutate({ action: 'navigate', questionIndex: attempt.activeQuestionIndex - 1 }).catch(() => undefined)}><ArrowLeft size={15} /> Previous</button><span>{saving ? 'Saving…' : 'Answers save automatically'}</span>{attempt.activeQuestionIndex < section.questionCount - 1 ? <button className="test-button test-button--primary" disabled={saving || clock === 0} onClick={() => void mutate({ action: 'navigate', questionIndex: attempt.activeQuestionIndex + 1 }).catch(() => undefined)}>Next <ArrowRight size={15} /></button> : <button className="test-button test-button--primary" disabled={saving} onClick={() => attempt.activeSectionIndex === attempt.sections.length - 1 ? setConfirmSubmit(true) : setFinishSectionConfirm(true)}>{attempt.activeSectionIndex === attempt.sections.length - 1 ? 'Review test' : 'Finish section'} <ArrowRight size={15} /></button>}</div></main><aside className="test-navigator"><div className="test-navigator-heading"><strong>Questions</strong><span>{section.questionCount}</span></div><p>Answered and flagged</p><div className="test-number-grid">{section.questions.map((item, index) => { const isAnswered = attempt.answers[item.id] !== undefined && attempt.answers[item.id] !== null; const isFlagged = Boolean(attempt.flags[item.id]); return <button key={item.id} className={`test-number${index === attempt.activeQuestionIndex ? ' is-current' : ''}${isAnswered ? ' is-answered' : ''}${isFlagged ? ' is-flagged' : ''}`} aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}${isFlagged ? ', flagged' : ''}`} aria-current={index === attempt.activeQuestionIndex ? 'step' : undefined} disabled={saving} onClick={() => void mutate({ action: 'navigate', questionIndex: index }).catch(() => undefined)}>{index + 1}{isFlagged && <Bookmark size={9} fill="currentColor" />}</button>; })}</div><div className="test-navigator-legend"><span><i className="is-answered" />Answered</span><span><i />Unanswered</span><span><Bookmark size={11} />Flagged</span></div><button className="test-navigator-review" onClick={() => attempt.activeSectionIndex === attempt.sections.length - 1 ? setConfirmSubmit(true) : setFinishSectionConfirm(true)}>{attempt.activeSectionIndex === attempt.sections.length - 1 ? 'Review & submit' : 'Finish section'} <ArrowRight size={14} /></button></aside></div>
    {showSubmitReview && <SubmitDialog attempt={attempt} onCancel={() => setConfirmSubmit(false)} onSubmit={() => void mutate({ action: 'submit' }).catch(() => undefined)} saving={saving} />}
    {finishSectionConfirm && <SubmitDialog attempt={attempt} onCancel={() => setFinishSectionConfirm(false)} onSubmit={() => void mutate({ action: 'finishSection' }).catch(() => undefined)} saving={saving} sectionMode />}
  </div>;
}

function SubmitDialog({ attempt, onCancel, onSubmit, saving, sectionMode = false }: { attempt: Attempt; onCancel: () => void; onSubmit: () => void; saving: boolean; sectionMode?: boolean }) {
  const section = attempt.sections[attempt.activeSectionIndex];
  const answered = section?.answeredCount ?? 0;
  const total = section?.questionCount ?? 0;
  return <div className="test-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="test-dialog" role="dialog" aria-modal="true" aria-labelledby="test-dialog-title"><span className="test-dialog-icon"><CheckCircle2 size={22} /></span><h2 id="test-dialog-title">{sectionMode ? 'Finish this section?' : 'Submit your test?'}</h2><p>{sectionMode ? `You’ve answered ${answered} of ${total} questions. Once you continue, you can’t return to ${section?.sectionName}.` : `You’ve answered ${Object.values(attempt.answers).filter((answer) => answer !== null).length} of ${attempt.sections.reduce((sum, item) => sum + item.questionCount, 0)} questions. Unanswered questions will be scored as incorrect.`}</p><div className="test-dialog-actions"><button className="test-button test-button--secondary" disabled={saving} onClick={onCancel}>Keep working</button><button className="test-button test-button--primary" disabled={saving} onClick={onSubmit}>{saving ? 'Saving…' : sectionMode ? 'Finish section' : 'Submit test'}</button></div></section></div>;
}
