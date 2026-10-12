'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, Clock3, LoaderCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import type { StudentPracticeQuestion, PracticeAnswerFeedback } from '@/lib/practice-flow';
import type { StudentExplanation } from '@/lib/ai-explanation';

type PracticeQuestion = StudentPracticeQuestion & { passage: string | null };
type Section = { id: string; name: string };
type Topic = { id: string; sectionId: string; name: string };
type QuestionsResponse = { questions?: PracticeQuestion[]; error?: string };
type SubmitResponse = { feedback?: PracticeAnswerFeedback; error?: string };

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function PracticeExperience() {
  const searchParams = useSearchParams();
  const initialSectionId = searchParams.get('sectionId') ?? '';
  const initialTopicId = searchParams.get('topicId') ?? '';
  const smartMode = searchParams.get('mode') === 'smart';
  const requestedMinutes = Number(searchParams.get('minutes')) || 0;
  const smartIdsQuery = searchParams.get('ids') ?? '';
  const smartIds = useMemo(() => smartIdsQuery.split(',').filter(Boolean), [smartIdsQuery]);
  const requestedLimit = Number(searchParams.get('limit')) || (smartMode ? smartIds.length : 100);
  const [sections, setSections] = useState<Section[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [topicId, setTopicId] = useState(initialTopicId);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<string, PracticeAnswerFeedback>>({});
  const [secondsByQuestion, setSecondsByQuestion] = useState<Record<string, number>>({});
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [flags, setFlags] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [flagError, setFlagError] = useState('');

  const currentQuestion = questions[questionIndex];
  const currentFeedback = currentQuestion ? feedbackByQuestion[currentQuestion.id] : undefined;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentSeconds = currentQuestion ? secondsByQuestion[currentQuestion.id] ?? 0 : 0;
  const filteredTopics = useMemo(() => topics.filter((topic) => !sectionId || topic.sectionId === sectionId), [topics, sectionId]);

  const loadQuestions = useCallback(async (nextSectionId: string, nextTopicId: string, limit = 100) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (smartMode && smartIds.length) {
      params.set('ids', smartIds.join(','));
      params.set('limit', String(limit));
    } else {
      if (nextSectionId) params.set('sectionId', nextSectionId);
      if (nextTopicId) params.set('topicId', nextTopicId);
      params.set('limit', String(limit));
    }
    try {
      const response = await fetch(`/api/student/practice/questions?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as QuestionsResponse;
      if (!response.ok) throw new Error(payload.error ?? 'Questions could not be loaded.');
      const nextQuestions = payload.questions ?? [];
      setQuestions(nextQuestions);
      setQuestionIndex(0);
      setAnswers({});
      setFeedbackByQuestion({});
      setSecondsByQuestion({});
      setFlagError('');
      const ids = nextQuestions.map(({ id }) => id);
      if (ids.length) {
        const flagParams = new URLSearchParams(ids.map((id) => ['id', id]));
        const flagResponse = await fetch(`/api/student/review/flags?${flagParams.toString()}`, { cache: 'no-store' });
        const flagPayload = await flagResponse.json() as { flaggedIds?: string[]; error?: string };
        if (!flagResponse.ok) throw new Error(flagPayload.error ?? 'Saved flags could not be loaded.');
        setFlags(new Set(flagPayload.flaggedIds ?? []));
      } else {
        setFlags(new Set());
      }
    } catch (cause) {
      setQuestions([]);
      setError(cause instanceof Error ? cause.message : 'Questions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [smartIds, smartMode]);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      try {
        const response = await fetch('/api/student/practice/catalog', { cache: 'no-store' });
        if (!response.ok) throw new Error('Practice sections could not be loaded.');
        const catalog = await response.json() as { sections: Section[]; topics: Topic[] };
        if (!cancelled) {
          setSections(catalog.sections);
          setTopics(catalog.topics);
          setSectionId(initialSectionId);
          setTopicId(initialTopicId);
          await loadQuestions(initialSectionId, initialTopicId, requestedLimit);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Practice could not be loaded.');
          setLoading(false);
        }
      }
    }
    void loadCatalog();
    return () => { cancelled = true; };
  }, [initialSectionId, initialTopicId, loadQuestions, requestedLimit]);

  useEffect(() => {
    if (!timerEnabled || !currentQuestion || currentFeedback || loading) return;
    const interval = window.setInterval(() => {
      setSecondsByQuestion((current) => ({ ...current, [currentQuestion.id]: (current[currentQuestion.id] ?? 0) + 1 }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerEnabled, currentQuestion, currentFeedback, loading]);

  function changeSection(nextSectionId: string) {
    setSectionId(nextSectionId);
    setTopicId('');
    void loadQuestions(nextSectionId, '', requestedLimit);
  }

  function changeTopic(nextTopicId: string) {
    setTopicId(nextTopicId);
    void loadQuestions(sectionId, nextTopicId, requestedLimit);
  }

  async function submitAnswer() {
    if (!currentQuestion || !currentAnswer || currentFeedback || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/student/practice/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedAnswer: currentAnswer,
          timeSpentSeconds: secondsByQuestion[currentQuestion.id] ?? 0,
        }),
      });
      const payload = await response.json() as SubmitResponse;
      if (!response.ok || !payload.feedback) throw new Error(payload.error ?? 'Your answer could not be saved.');
      setFeedbackByQuestion((current) => ({ ...current, [currentQuestion.id]: payload.feedback! }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your answer could not be saved.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFlag() {
    if (!currentQuestion) return;
    const wasFlagged = flags.has(currentQuestion.id);
    setFlagError('');
    try {
      const response = await fetch('/api/student/review/flags', {
        method: wasFlagged ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Your flag could not be saved.');
      setFlags((current) => {
        const next = new Set(current);
        if (wasFlagged) next.delete(currentQuestion.id);
        else next.add(currentQuestion.id);
        return next;
      });
    } catch (cause) {
      setFlagError(cause instanceof Error ? cause.message : 'Your flag could not be saved.');
    }
  }


  const progress = questions.length ? ((questionIndex + 1) / questions.length) * 100 : 0;
  const sectionName = sections.find(({ id }) => id === currentQuestion?.sectionId)?.name ?? currentQuestion?.section ?? 'Practice';

  return (
    <div className="practice-page">
      {smartMode && <div className="practice-smart-banner"><span><Sparkles size={14} /> Smart Practice · {requestedMinutes} minutes</span><Link href="/smart-practice">Change session</Link></div>}
      <div className="practice-topline">
        <div className="practice-controls">
          <label className="practice-filter"><span>Section</span><select disabled={smartMode} value={sectionId} onChange={(event) => changeSection(event.target.value)} aria-label="Choose ACT section">
            <option value="">All sections</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </select></label>
          <label className="practice-filter"><span>Topic</span><select disabled={smartMode} value={topicId} onChange={(event) => changeTopic(event.target.value)} aria-label="Choose topic">
            <option value="">All topics</option>{filteredTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select></label>
        </div>
        <label className="practice-timer-toggle"><input type="checkbox" checked={timerEnabled} onChange={(event) => setTimerEnabled(event.target.checked)} /><span className="practice-switch" aria-hidden="true" /><Clock3 size={15} /><span>Timer</span></label>
      </div>

      {loading ? <div className="practice-state"><LoaderCircle className="practice-spin" size={22} /><span>Finding your next question…</span></div> : error && !currentQuestion ? <div className="practice-state practice-state--error" role="alert">{error}<button type="button" onClick={() => void loadQuestions(sectionId, topicId, requestedLimit)}>Try again</button></div> : !currentQuestion ? <div className="practice-state"><BookOpenEmpty /><strong>No questions here yet</strong><span>Try another section or topic.</span></div> : <>
        <header className="practice-progress-header">
          <div className="practice-meta"><span className="practice-section-label">{sectionName}</span><span className="practice-meta-dot" /><span>{currentQuestion.topic}{currentQuestion.subtopic ? ` · ${currentQuestion.subtopic}` : ''}</span><span className="practice-question-number">Question {questionIndex + 1} <span>of {questions.length}</span></span></div>
          <div className="practice-progress-track" role="progressbar" aria-label="Practice progress" aria-valuenow={questionIndex + 1} aria-valuemin={1} aria-valuemax={questions.length}><span style={{ width: `${progress}%` }} /></div>
        </header>

        <section className="practice-work" aria-label="Practice question">
          <div className="practice-question-topline"><span className="practice-question-topic">{currentQuestion.subtopic ?? currentQuestion.topic}</span><div className="practice-question-tools">{timerEnabled && <span className="practice-time" aria-label={`Time spent ${formatTime(currentSeconds)}`}><Clock3 size={14} />{formatTime(currentSeconds)}</span>}<button className={`practice-flag${flags.has(currentQuestion.id) ? ' is-flagged' : ''}`} type="button" onClick={() => void toggleFlag()} aria-pressed={flags.has(currentQuestion.id)}>{flags.has(currentQuestion.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}<span>{flags.has(currentQuestion.id) ? 'Flagged' : 'Flag'}</span></button></div></div>
          {flagError && <p className="practice-inline-error" role="alert">{flagError}</p>}

          <article className="practice-question-card" aria-labelledby="practice-question-text">
            {currentQuestion.passage && <div className="practice-passage"><span>PASSAGE</span><p>{currentQuestion.passage}</p></div>}
            <h2 id="practice-question-text">{currentQuestion.question}</h2>
            <fieldset className="practice-choices" disabled={Boolean(currentFeedback) || submitting}>
              <legend className="sr-only">Answer choices</legend>
              {currentQuestion.choices.map((choice) => {
                const selected = currentAnswer === choice.id;
                const right = currentFeedback?.correctAnswer === choice.id;
                const wrongSelected = currentFeedback && selected && !currentFeedback.isCorrect;
                return <label key={choice.id} className={`practice-choice${selected ? ' is-selected' : ''}${right ? ' is-correct' : ''}${wrongSelected ? ' is-incorrect' : ''}`}>
                  <input type="radio" name={`answer-${currentQuestion.id}`} value={choice.id} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: choice.id }))} />
                  <span className="practice-choice-letter">{choice.id}</span><span className="practice-choice-text">{choice.text}</span>
                  {right && <Check size={17} className="practice-choice-mark" aria-label="Correct answer" />}{wrongSelected && <X size={17} className="practice-choice-mark" aria-label="Your selected answer" />}
                </label>;
              })}
            </fieldset>
          </article>

          {error && <p className="practice-inline-error" role="alert">{error}</p>}

          {currentFeedback && <section className={`practice-feedback${currentFeedback.isCorrect ? ' is-correct' : ' is-incorrect'}`} aria-live="polite">
            <div className="practice-feedback-heading"><span className="practice-feedback-icon">{currentFeedback.isCorrect ? <Check size={17} /> : <X size={17} />}</span><div><h3>{currentFeedback.isCorrect ? 'That’s correct' : 'Not quite'}</h3><p>{currentFeedback.isCorrect ? 'Nice work. Keep building on that.' : `The correct answer is ${currentFeedback.correctAnswer}.`}</p></div></div>
            {currentFeedback.aiExplanation ? <ExplanationDetails explanation={currentFeedback.aiExplanation} /> : <p className="practice-explanation">{currentFeedback.explanation}</p>}
            <div className="practice-coaching"><div><strong><Sparkles size={14} /> Key concept</strong><span>{currentFeedback.keyConcept}</span></div><div><strong><RotateCcw size={14} /> ACT strategy</strong><span>{currentFeedback.actStrategy}</span></div></div>
          </section>}

          <footer className="practice-actions">
            <button type="button" className="practice-nav-button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(index - 1, 0))}><ChevronLeft size={17} />Previous</button>
            <span className="practice-answered-count">{Object.keys(feedbackByQuestion).length} answered</span>
            {!currentFeedback && <button type="button" className="practice-submit-button" disabled={!currentAnswer || submitting} onClick={() => void submitAnswer()}>{submitting ? <><LoaderCircle size={16} className="practice-spin" />Saving…</> : 'Submit'}</button>}
            <button type="button" className="practice-next-button" disabled={questionIndex >= questions.length - 1} onClick={() => setQuestionIndex((index) => Math.min(index + 1, questions.length - 1))}>Next<ChevronRight size={17} /></button>
          </footer>
        </section>
      </>}
    </div>
  );
}

function ExplanationDetails({ explanation }: { explanation: StudentExplanation }) {
  return <div className="practice-ai-explanation">
    <p className="practice-explanation"><strong>Correct answer: {explanation.correctAnswerText}</strong></p>
    <div className="practice-ai-section"><strong>Step-by-step</strong><ol>{explanation.stepByStep.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol></div>
    <div className="practice-ai-section"><strong>{explanation.whySelectedAnswerWasIncorrect.startsWith('Your selected answer is correct') ? 'Your answer' : 'Why your answer was incorrect'}</strong><p>{explanation.whySelectedAnswerWasIncorrect}</p></div>
    {explanation.shortcut && <div className="practice-ai-shortcut"><strong>Shortcut</strong><p>{explanation.shortcut}</p></div>}
    <div className="practice-ai-takeaway"><strong>Takeaway</strong><p>{explanation.takeaway}</p></div>
    <span className="practice-ai-source">{explanation.generatedByAI ? 'AI-assisted explanation' : 'Question-bank explanation'}{explanation.calculationChecksVerified > 0 ? ` · ${explanation.calculationChecksVerified} calculation${explanation.calculationChecksVerified === 1 ? '' : 's'} checked` : ''}</span>
  </div>;
}

function BookOpenEmpty() {
  return <span className="practice-empty-mark" aria-hidden="true"><Sparkles size={19} /></span>;
}
