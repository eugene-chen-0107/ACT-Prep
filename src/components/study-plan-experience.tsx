'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, CalendarDays, Check, Clock3, LoaderCircle, RefreshCw, Sparkles, Target } from 'lucide-react';
import { STUDY_PLAN_DAYS } from '@/lib/study-plan-engine';

type Task = { id: string; title: string; description: string | null; section: string | null; topic: string | null; taskDate: string | Date | null; estimatedMinutes: number | null; status: 'pending' | 'in_progress' | 'completed' | 'skipped'; priority: number; source: string };
type PlanData = { studyPlan: { plan: { id: string; title: string; targetScore: number | null; targetDate: string | Date | null }; tasks: Task[]; progress: { daily: { total: number; completed: number; minutes: number }; weekly: { total: number; completed: number; minutes: number } } } | null };
type Generated = { planId?: string; schedule?: { tasks: Array<{ day: string; date: string; title: string; description: string; minutes: number; priority: number; source: string }> }; error?: string };
const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};
const taskDateKey = (value: string | Date) => {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function StudyPlanExperience() {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [error, setError] = useState('');
  const [targetScore, setTargetScore] = useState('28');
  const [currentPerformance, setCurrentPerformance] = useState('20');
  const [testDate, setTestDate] = useState('');
  const [minutesPerDay, setMinutesPerDay] = useState('15');
  const [days, setDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/student/study-plans', { cache: 'no-store' });
      const payload = await response.json() as PlanData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Study plan could not be loaded.');
      setData(payload);
      if (payload.studyPlan) {
        setTargetScore(String(payload.studyPlan.plan.targetScore ?? 28));
        setTestDate(new Date(payload.studyPlan.plan.targetDate ?? Date.now()).toISOString().slice(0, 10));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Study plan could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    for (const task of data?.studyPlan?.tasks ?? []) {
      const key = task.taskDate ? taskDateKey(task.taskDate) : '';
      groups.set(key, [...(groups.get(key) ?? []), task]);
    }
    return groups;
  }, [data]);

  async function createPlan() {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/student/study-plans', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetScore: Number(targetScore), currentPerformance: { Overall: Number(currentPerformance) }, testDate, daysAvailable: days, minutesPerDay: Number(minutesPerDay) }),
      });
      const payload = await response.json() as Generated;
      if (!response.ok) throw new Error(payload.error ?? 'Study plan could not be generated.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Study plan could not be generated.'); }
    finally { setSaving(false); }
  }

  async function updateTask(task: Task, update: { status?: Task['status']; taskDate?: string }) {
    setError('');
    try {
      const response = await fetch(`/api/student/study-plans/${encodeURIComponent(task.id)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(update),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Task could not be updated.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Task could not be updated.'); }
  }

  async function adapt() {
    if (!data?.studyPlan) return;
    setAdapting(true); setError('');
    try {
      const response = await fetch(`/api/student/study-plans/${encodeURIComponent(data.studyPlan.plan.id)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'adapt' }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Plan could not adapt.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Plan could not adapt.'); }
    finally { setAdapting(false); }
  }

  return <main className="study-plan-page">
    <header className="study-plan-heading"><span><CalendarDays size={21} /></span><div><p>ADAPTIVE WEEKLY ROUTINE</p><h1>Your ACT study plan</h1><small>The schedule adjusts to your diagnostic and practice results. You can change any day or task.</small></div></header>
    {error && <p className="study-plan-error" role="alert">{error}</p>}
    {!data?.studyPlan && !loading && <section className="study-plan-card study-plan-setup">
      <div className="study-plan-card-heading"><Target size={18} /><div><h2>Build your first weekly plan</h2><p>Tell us your goal and realistic study availability.</p></div></div>
      <div className="study-plan-form-grid">
        <label>Target ACT score<input type="number" min="1" max="36" value={targetScore} onChange={(event) => setTargetScore(event.target.value)} /></label>
        <label>Current / diagnostic composite estimate<input type="number" min="1" max="36" value={currentPerformance} onChange={(event) => setCurrentPerformance(event.target.value)} /></label>
        <label>Test date<input type="date" min={todayIso()} value={testDate} onChange={(event) => setTestDate(event.target.value)} /></label>
        <label>Minutes available per day<input type="number" min="5" max="240" value={minutesPerDay} onChange={(event) => setMinutesPerDay(event.target.value)} /></label>
      </div>
      <fieldset className="study-plan-days"><legend>Days available each week</legend>{STUDY_PLAN_DAYS.map((day) => <label key={day}><input type="checkbox" checked={days.includes(day)} onChange={() => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])} />{day.slice(0, 3)}</label>)}</fieldset>
      <button type="button" className="study-plan-primary" disabled={saving || !testDate || !days.length} onClick={() => void createPlan()}>{saving ? <LoaderCircle className="study-plan-spin" size={16} /> : <Sparkles size={16} />} Create adaptive plan</button>
    </section>}
    {loading && <div className="study-plan-loading"><LoaderCircle className="study-plan-spin" size={20} />Loading your plan…</div>}
    {data?.studyPlan && <>
      <section className="study-plan-progress-grid">
        <article className="study-plan-progress-card"><span>TODAY</span><strong>{data.studyPlan.progress.daily.completed}/{data.studyPlan.progress.daily.total}</strong><small>tasks complete · {data.studyPlan.progress.daily.minutes} planned min</small><div><i style={{ width: `${data.studyPlan.progress.daily.total ? data.studyPlan.progress.daily.completed / data.studyPlan.progress.daily.total * 100 : 0}%` }} /></div></article>
        <article className="study-plan-progress-card"><span>THIS WEEK</span><strong>{data.studyPlan.progress.weekly.completed}/{data.studyPlan.progress.weekly.total}</strong><small>tasks complete · {data.studyPlan.progress.weekly.minutes} planned min</small><div><i style={{ width: `${data.studyPlan.progress.weekly.total ? data.studyPlan.progress.weekly.completed / data.studyPlan.progress.weekly.total * 100 : 0}%` }} /></div></article>
        <article className="study-plan-goal"><span><Target size={16} /> TARGET</span><strong>{data.studyPlan.plan.targetScore ?? '—'}</strong><small>by {data.studyPlan.plan.targetDate ? new Date(data.studyPlan.plan.targetDate).toLocaleDateString() : 'test day'}</small></article>
      </section>
      <div className="study-plan-week-heading"><div><p>YOUR CURRENT WEEK</p><h2>Flexible focus, based on your results</h2></div><button type="button" disabled={adapting} onClick={() => void adapt()}>{adapting ? <LoaderCircle className="study-plan-spin" size={14} /> : <RefreshCw size={14} />} Refresh from performance</button></div>
      <p className="study-plan-adaptive-note">When a skill improves, its priority drops and unfinished time shifts toward remaining weaknesses. Completed and skipped tasks stay as you set them.</p>
      <div className="study-plan-days-list">{STUDY_PLAN_DAYS.map((day) => {
        const firstTaskDate = data.studyPlan!.tasks.find((task) => task.taskDate)?.taskDate;
        const monday = new Date(`${firstTaskDate ? taskDateKey(firstTaskDate) : todayIso()}T12:00:00`);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        const date = new Date(monday); date.setDate(monday.getDate() + STUDY_PLAN_DAYS.indexOf(day));
        const key = localDateKey(date);
        const tasks = grouped.get(key) ?? [];
        return <section className="study-plan-day" key={day}><header><span>{day}</span><small>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></header>{tasks.length ? tasks.map((task) => <article className={`study-plan-task is-${task.status}`} key={task.id}>
          <div className="study-plan-task-copy"><strong>{task.title}</strong><small>{task.description} · Priority {task.priority}</small><span><Clock3 size={12} />{task.estimatedMinutes} minutes · {task.source}</span></div>
          <div className="study-plan-task-actions">{task.status === 'pending' && <><button type="button" title="Mark complete" onClick={() => void updateTask(task, { status: 'completed' })}><Check size={14} /></button><button type="button" title="Skip task" onClick={() => void updateTask(task, { status: 'skipped' })}>Skip</button></>}{task.status === 'skipped' && <button type="button" title="Restore skipped task" onClick={() => void updateTask(task, { status: 'pending' })}>Restore</button>}{task.status !== 'completed' && <label title="Reschedule"><ArrowDownUp size={13} /><input type="date" value={task.taskDate ? new Date(task.taskDate).toISOString().slice(0, 10) : ''} onChange={(event) => event.target.value && void updateTask(task, { taskDate: event.target.value })} /></label>}{task.status === 'completed' && <span className="study-plan-complete"><Check size={14} /> Done</span>}{task.status === 'skipped' && <span className="study-plan-skipped">Skipped</span>}</div>
        </article>) : <p className="study-plan-rest">No session planned—take a rest day or add availability next week.</p>}</section>;
      })}</div>
    </>}
  </main>;
}
