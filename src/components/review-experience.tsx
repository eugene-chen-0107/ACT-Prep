'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Bookmark, CalendarClock, Check, CircleAlert, LoaderCircle, RotateCcw, Target } from 'lucide-react';
import type { ReviewData, ReviewQuestion, ReviewSkill } from '@/lib/spaced-review';

type ReviewResponse = { review?: ReviewData; error?: string };

function dateLabel(value: string | null) {
  if (!value) return 'Not answered yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function answerLabel(question: ReviewQuestion, answer: string | null) {
  if (!answer) return 'No saved answer';
  const option = question.options.find(({ id }) => id === answer);
  return option ? `${answer}. ${option.text}` : answer;
}

function PracticeSkillLink({ section, topic }: { section: string; topic: string }) {
  const params = new URLSearchParams({ minutes: '10', section, topic });
  return <Link className="review-practice-link" href={`/smart-practice?${params.toString()}`}>Practice This Skill <ArrowRight size={14} /></Link>;
}

function QuestionCard({ question }: { question: ReviewQuestion }) {
  return <article className="review-question-card">
    <div className="review-question-heading"><span>{question.section} · {question.topic}{question.subtopic ? ` · ${question.subtopic}` : ''}</span><span>{question.attemptCount} {question.attemptCount === 1 ? 'attempt' : 'attempts'}</span></div>
    {question.passage && <div className="review-passage"><strong>Passage</strong><p>{question.passage}</p></div>}
    <h4>{question.prompt}</h4>
    {question.options.length > 0 && <ul className="review-options">{question.options.map((option) => <li key={option.id} className={option.id === question.correctAnswer ? 'is-correct' : option.id === question.selectedAnswer ? 'is-selected' : ''}><span>{option.id}</span>{option.text}{option.id === question.correctAnswer && <Check size={14} aria-label="Correct answer" />}</li>)}</ul>}
    {question.attemptedAt && <div className="review-answer-grid"><div><span>Your answer</span><strong>{answerLabel(question, question.selectedAnswer)}</strong></div><div><span>Correct answer</span><strong>{answerLabel(question, question.correctAnswer)}</strong></div></div>}
    <p className="review-explanation"><strong>Explanation</strong>{question.attemptedAt ? question.explanation : 'Submit an answer in Practice to unlock the explanation.'}</p>
    <div className="review-card-footer"><span><CalendarClock size={13} />{question.flaggedAt && !question.attemptedAt ? `Flagged ${dateLabel(question.flaggedAt)}` : `Last answered ${dateLabel(question.attemptedAt)}`}{question.nextReviewAt ? ` · Due ${dateLabel(question.nextReviewAt)}` : ''}</span><PracticeSkillLink section={question.section} topic={question.topic} /></div>
    <details className="review-history"><summary><RotateCcw size={13} /> Previous attempts ({question.previousAttempts.length})</summary>{question.previousAttempts.length ? <ol>{question.previousAttempts.map((attempt, index) => <li key={`${attempt.attemptedAt}-${index}`}><span>{dateLabel(attempt.attemptedAt)} · {attempt.isCorrect ? 'Correct' : 'Incorrect'}</span><span>Your answer: {answerLabel(question, attempt.selectedAnswer)}{attempt.correctAnswer ? ` · Correct: ${answerLabel(question, attempt.correctAnswer)}` : ''}</span></li>)}</ol> : <p>No previous attempts saved.</p>}</details>
  </article>;
}

function QuestionSection({ title, description, icon: Icon, questions, empty }: { title: string; description: string; icon: typeof Activity; questions: ReviewQuestion[]; empty: string }) {
  return <section className="review-section">
    <header className="review-section-heading"><span className="review-section-icon"><Icon size={17} /></span><div><h3>{title}</h3><p>{description}</p></div><span className="review-section-count">{questions.length}</span></header>
    {questions.length ? <div className="review-question-list">{questions.map((question) => <QuestionCard key={question.questionId} question={question} />)}</div> : <p className="review-empty">{empty}</p>}
  </section>;
}

function WeakestSkills({ skills }: { skills: ReviewSkill[] }) {
  return <section className="review-section">
    <header className="review-section-heading"><span className="review-section-icon"><Target size={17} /></span><div><h3>Weakest Skills</h3><p>Skills with at least two saved attempts, ordered by accuracy.</p></div><span className="review-section-count">{skills.length}</span></header>
    {skills.length ? <div className="review-skill-list">{skills.map((skill) => <div className="review-skill" key={`${skill.section}-${skill.topic}`}>
      <header><div><strong>{skill.topic}</strong><span>{skill.section} · {skill.attempts} attempts · {skill.correct} correct</span></div><span className="review-skill-accuracy">{skill.accuracy}%</span></header>
      <div className="review-skill-bar" role="progressbar" aria-label={`${skill.topic} accuracy`} aria-valuenow={skill.accuracy} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${skill.accuracy}%` }} /></div>
      <PracticeSkillLink section={skill.section} topic={skill.topic} />
      {skill.questions.length > 0 && <div className="review-skill-questions">{skill.questions.map((question) => <QuestionCard key={question.questionId} question={question} />)}</div>}
    </div>)}</div> : <p className="review-empty">Practice a skill at least twice to see an honest accuracy signal here.</p>}
  </section>;
}

export function ReviewExperience() {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadReview() {
      try {
        const response = await fetch('/api/student/review', { cache: 'no-store' });
        const payload = await response.json() as ReviewResponse;
        if (!response.ok || !payload.review) throw new Error(payload.error ?? 'Review data could not be loaded.');
        if (!cancelled) setReview(payload.review);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Review data could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadReview();
    return () => { cancelled = true; };
  }, []);

  return <main className="review-page">
    <header className="review-heading"><span className="review-heading-mark"><RotateCcw size={20} /></span><div><span className="review-eyebrow">LEARN FROM EVERY ATTEMPT</span><h2>Review</h2><p>Revisit missed and flagged questions, strengthen weaker skills, and let review timing adapt as you improve.</p></div></header>
    {loading ? <div className="review-state"><LoaderCircle size={20} className="review-spin" />Loading your review…</div> : error ? <div className="review-state review-state--error" role="alert"><CircleAlert size={17} />{error}</div> : review && <>
      <aside className="review-schedule-note"><CalendarClock size={17} /><p><strong>A simple schedule that adapts.</strong> Missed questions return after 1 day. After correct answers, the interval grows to 3, 7, then 14 days. Due dates are calculated from your latest saved attempt.</p><span>{review.totalAttempts} saved {review.totalAttempts === 1 ? 'attempt' : 'attempts'}</span></aside>
      <div className="review-sections">
        <QuestionSection title="Due for Review" description="Questions whose review interval has arrived." icon={CalendarClock} questions={review.dueForReview} empty="Nothing is due right now. Missed questions come back sooner; correct streaks lengthen the interval." />
        <QuestionSection title="Recently Missed" description="Questions most recently answered incorrectly in the last 7 days." icon={CircleAlert} questions={review.recentlyMissed} empty="No recent misses. New incorrect answers will show here." />
        <QuestionSection title="Repeated Mistakes" description="Questions missed incorrectly at least twice." icon={RotateCcw} questions={review.repeatedMistakes} empty="No repeated mistakes found yet." />
        <WeakestSkills skills={review.weakestSkills} />
        <QuestionSection title="Flagged Questions" description="Questions you saved from Practice for another look." icon={Bookmark} questions={review.flaggedQuestions} empty="No flagged questions. Use the Flag control in Practice to save one here." />
      </div>
    </>}
  </main>;
}
