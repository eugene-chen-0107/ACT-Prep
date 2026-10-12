'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, LoaderCircle, RotateCcw, Sparkles, Target } from 'lucide-react';
import type { StudentPracticeQuestion } from '@/lib/practice-flow';
import type { DiagnosticReport } from '@/lib/diagnostic-assessment';

type DiagnosticQuestion = StudentPracticeQuestion & { passage: string | null };
type Started = { id: string; questions: DiagnosticQuestion[] };
type ResponsePayload = { assessmentId: string; questionId: string; selectedAnswer: string; timeSpentSeconds: number };

export function DiagnosticExperience() {
  const [assessment, setAssessment] = useState<Started | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState<Record<string, number>>({});
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const current = assessment?.questions[index];
  const startRef = useRef(false);

  async function start() {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const response = await fetch('/api/student/diagnostic', { cache: 'no-store' });
      const payload = await response.json() as Started & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Diagnostic could not start.');
      setAssessment(payload);
      setIndex(0);
      setAnswers({});
      setSeconds({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Diagnostic could not start.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (startRef.current) return;
    startRef.current = true;
    void start();
  }, []);
  useEffect(() => {
    if (!current || report) return;
    const timer = window.setInterval(() => setSeconds((prior) => ({ ...prior, [current.id]: (prior[current.id] ?? 0) + 1 })), 1000);
    return () => window.clearInterval(timer);
  }, [current, report]);

  async function saveCurrent() {
    if (!assessment || !current) return;
    const selectedAnswer = answers[current.id];
    if (!selectedAnswer) { setError('Choose an answer to continue.'); return; }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/student/diagnostic', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assessmentId: assessment.id, questionId: current.id, selectedAnswer, timeSpentSeconds: seconds[current.id] ?? 0 } satisfies ResponsePayload),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Answer could not be saved.');
      if (index + 1 < assessment.questions.length) setIndex((value) => value + 1);
      else {
        const completed = await fetch('/api/student/diagnostic', {
          method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assessmentId: assessment.id }),
        });
        const completion = await completed.json() as { report?: DiagnosticReport; error?: string };
        if (!completed.ok || !completion.report) throw new Error(completion.error ?? 'Your report could not be created.');
        setReport(completion.report);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Answer could not be saved.');
    } finally { setSaving(false); }
  }

  if (loading) return <main className="diagnostic-page"><div className="diagnostic-state"><LoaderCircle className="diagnostic-spin" />Preparing a balanced diagnostic…</div></main>;
  if (error && !assessment) return <main className="diagnostic-page"><div className="diagnostic-state diagnostic-error" role="alert"><p>{error}</p><button type="button" onClick={() => void start()}>Try again</button></div></main>;

  if (report) return <main className="diagnostic-page">
    <header className="diagnostic-heading"><span className="diagnostic-mark"><CheckCircle2 size={21} /></span><div><p className="diagnostic-eyebrow">YOUR STARTING POINT</p><h1>Diagnostic report</h1><p>These are estimates based only on your diagnostic answers—not official ACT scores.</p></div></header>
    <div className="diagnostic-disclaimer" role="note"><strong>{report.label}</strong><span>Use these estimates to choose what to practice next. They are not official ACT scores or score predictions.</span></div>
    <section className="diagnostic-report-card"><h2>Current estimated performance</h2><div className="diagnostic-score-grid">{report.estimatedPerformance.map((item) => <article key={item.section}><span>{item.section}</span><strong>{item.estimatedScore ?? '—'}</strong><small>{item.accuracy === null ? 'No responses' : `${item.accuracy}% correct · ${item.correct}/${item.total}`}</small></article>)}</div></section>
    <section className="diagnostic-report-grid">
      <article className="diagnostic-report-card"><h2><Target size={16} /> Priority topics</h2>{report.priorityTopics.length ? <ol className="diagnostic-priority-list">{report.priorityTopics.map((skill, i) => <li key={`${skill.section}-${skill.topic}`}><span>{i + 1}</span><div><strong>{skill.topic}</strong><small>{skill.section} · {skill.accuracy}% correct</small></div></li>)}</ol> : <p>Keep practicing across all sections to find priority topics.</p>}</article>
      <article className="diagnostic-report-card"><h2><Clock3 size={16} /> Pacing observations</h2><p>{report.pacing.observation}</p><small>Average: {report.pacing.averageSecondsPerQuestion}s per question · estimate: {report.pacing.averageExpectedSeconds}s.</small></article>
    </section>
    <section className="diagnostic-report-grid">
      <article className="diagnostic-report-card"><h2>Strong skills</h2>{report.strongSkills.length ? report.strongSkills.map((skill) => <p className="diagnostic-skill-row" key={`${skill.section}-${skill.topic}`}><strong>{skill.topic}</strong><span>{skill.section} · {skill.accuracy}%</span></p>) : <p>More answers will help identify strengths.</p>}</article>
      <article className="diagnostic-report-card"><h2>Skills to build</h2>{report.weakSkills.length ? report.weakSkills.map((skill) => <p className="diagnostic-skill-row" key={`${skill.section}-${skill.topic}`}><strong>{skill.topic}</strong><span>{skill.section} · {skill.accuracy}%</span></p>) : <p>No repeated low-scoring skill yet. Continue practicing to build a clearer picture.</p>}</article>
    </section>
    {report.priorityTopics[0] ? <div className="diagnostic-next-step"><div><Sparkles size={17} /><span><strong>Your first Smart Practice session</strong><small>Start with {report.priorityTopics[0].topic} in {report.priorityTopics[0].section}.</small></span></div><Link href={`/smart-practice?minutes=10&section=${encodeURIComponent(report.priorityTopics[0].section)}&topic=${encodeURIComponent(report.priorityTopics[0].topic)}`}>Build session <ArrowRight size={15} /></Link></div> : <div className="diagnostic-next-step"><span>Start a balanced session across available topics.</span><Link href="/smart-practice?minutes=10">Build session <ArrowRight size={15} /></Link></div>}
    <button className="diagnostic-restart" type="button" onClick={() => void start()}><RotateCcw size={14} /> Retake diagnostic</button>
  </main>;

  if (!assessment || !current) return <main className="diagnostic-page"><div className="diagnostic-state">No diagnostic questions are available.</div></main>;
  const selected = answers[current.id];
  const progress = Math.round((index + 1) / assessment.questions.length * 100);
  return <main className="diagnostic-page">
    <header className="diagnostic-heading"><span className="diagnostic-mark"><Target size={21} /></span><div><p className="diagnostic-eyebrow">A PERSONAL BASELINE</p><h1>ACT diagnostic</h1><p>Questions across English, Math, Reading, and Science. Your results are diagnostic estimates, not official ACT scores.</p></div></header>
    <div className="diagnostic-progress-meta"><span>{current.section} · {current.topic} · {current.difficulty}</span><strong>{index + 1} of {assessment.questions.length}</strong></div>
    <div className="diagnostic-progress"><span style={{ width: `${progress}%` }} /></div>
    <article className="diagnostic-question-card">
      <div className="diagnostic-question-tools"><span>{current.subtopic ?? current.topic}</span><small><Clock3 size={13} /> {Math.floor((seconds[current.id] ?? 0) / 60)}:{String((seconds[current.id] ?? 0) % 60).padStart(2, '0')}</small></div>
      {current.passage && <div className="diagnostic-passage"><small>PASSAGE / DATA</small><p>{current.passage}</p></div>}
      <h2>{current.question}</h2>
      <fieldset className="diagnostic-choices"><legend className="sr-only">Choose one answer</legend>{current.choices.map((choice) => <label key={choice.id} className={selected === choice.id ? 'is-selected' : ''}><input type="radio" name={`diagnostic-${current.id}`} value={choice.id} checked={selected === choice.id} onChange={() => setAnswers((prior) => ({ ...prior, [current.id]: choice.id }))} /><span>{choice.id}</span><span>{choice.text}</span></label>)}</fieldset>
    </article>
    {error && <p className="diagnostic-error" role="alert">{error}</p>}
    <footer className="diagnostic-actions"><span>{assessment.questions.length - index - 1} questions remaining</span><button type="button" disabled={!selected || saving} onClick={() => void saveCurrent()}>{saving ? <><LoaderCircle className="diagnostic-spin" size={15} />Saving…</> : index === assessment.questions.length - 1 ? 'Finish diagnostic' : 'Save and continue'} <ArrowRight size={15} /></button></footer>
  </main>;
}
