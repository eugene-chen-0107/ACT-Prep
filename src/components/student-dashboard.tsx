import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Flame,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { DashboardMetrics } from '@/lib/dashboard-metrics';

type DashboardData = DashboardMetrics & { studentName: string };

function formatAccuracyChange(value: number | null) {
  if (value === null) return 'Keep practicing to see your weekly trend';
  if (value === 0) return 'Holding steady vs. last week';
  return `${Math.abs(value)} points ${value > 0 ? 'up' : 'down'} vs. last week`;
}

export function StudentDashboard({ data }: { data: DashboardData }) {
  const recommendation = data.recommendation;
  const maxActivity = Math.max(...data.activity.map((day) => day.minutes), 1);
  const goalPercent = data.today.goalProgress ?? 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">YOUR PREP, AT A GLANCE</p>
          <h2>Good to see you, {data.studentName.split(' ')[0]}.</h2>
          <p>Small, focused sessions add up. Here’s the next best step.</p>
        </div>
        <Link className="dashboard-header-link" href="/progress">View progress <ArrowUpRight size={15} /></Link>
      </header>

      <section className="dashboard-recommendation" aria-labelledby="dashboard-recommendation-title">
        <div className="dashboard-recommendation-copy">
          <div className="dashboard-section-label"><span className="dashboard-sparkle">✳</span> RECOMMENDED FOR YOU</div>
          {recommendation ? <>
            <p className="dashboard-recommendation-context">A skill worth strengthening</p>
            <h3 id="dashboard-recommendation-title">{recommendation.topic}</h3>
            <p className="dashboard-recommendation-section">{recommendation.section}</p>
            <p className="dashboard-recommendation-accuracy">Your recent accuracy <strong>{recommendation.accuracy}%</strong><span>· {recommendation.attempts} {recommendation.attempts === 1 ? 'question' : 'questions'} tried</span></p>
            <Link className="dashboard-primary-button" href={recommendation.href}>Practice this topic <ArrowRight size={16} /></Link>
          </> : <>
            <p className="dashboard-recommendation-context">Let’s find your starting point</p>
            <h3 id="dashboard-recommendation-title">Your next best step starts with one question.</h3>
            <p className="dashboard-recommendation-description">Complete a short practice session and we’ll use your results to recommend the topic that needs the most attention.</p>
            <Link className="dashboard-primary-button" href="/practice">Start practicing <ArrowRight size={16} /></Link>
          </>}
        </div>
        <div className="dashboard-recommendation-detail">
          <div className="dashboard-recommendation-icon"><Target size={22} /></div>
          <span className="dashboard-detail-label">YOUR FOCUSED SESSION</span>
          <strong>{recommendation ? `${recommendation.questionCount} questions` : 'A few questions'}</strong>
          <span className="dashboard-detail-time"><Clock3 size={14} /> {recommendation ? `About ${recommendation.estimatedMinutes} minutes` : 'About 10 minutes'}</span>
          {recommendation && <span className="dashboard-detail-footnote">Based on your recent practice</span>}
        </div>
      </section>

      <div className="dashboard-summary-grid">
        <section className="dashboard-card dashboard-score-card" aria-labelledby="dashboard-score-title">
          <div className="dashboard-card-heading"><div><span className="dashboard-card-kicker">WHERE AM I?</span><h3 id="dashboard-score-title">ACT score</h3></div><Target size={17} /></div>
          <div className="dashboard-score-pair">
            <div><span className="dashboard-metric-label">Estimated</span><strong className="dashboard-score-value">—</strong><span className="dashboard-metric-note">Estimate unavailable</span></div>
            <span className="dashboard-score-divider" aria-hidden="true" />
            <div><span className="dashboard-metric-label">Your target</span><strong className="dashboard-score-value">{data.targetScore ?? '—'}</strong><span className="dashboard-metric-note">{data.targetScore ? 'ACT composite' : <Link href="/profile">Set a goal</Link>}</span></div>
          </div>
          {data.latestTestScore !== null ? <div className="dashboard-target-progress"><div><span>Latest test</span><strong>{data.latestTestScore} <small>/ 36</small></strong></div>{data.targetScore !== null ? <><div className="dashboard-progress-track"><span style={{ width: `${data.targetProgress ?? 0}%` }} /></div><small>{data.targetProgress}% of target score</small></> : <small>Add a target score to see your progress.</small>}</div> : <p className="dashboard-score-unavailable">We don’t turn practice accuracy into an ACT score. Your latest scored test appears here when available.</p>}
          <Link className="dashboard-subtle-link" href="/tests">{data.latestTestScore !== null ? 'View test results' : 'Take a practice test'} <ArrowRight size={14} /></Link>
        </section>

        <section className="dashboard-card dashboard-goal-card" aria-labelledby="dashboard-goal-title">
          <div className="dashboard-card-heading"><div><span className="dashboard-card-kicker">TODAY</span><h3 id="dashboard-goal-title">Your daily goal</h3></div><CheckCircle2 size={17} /></div>
          <div className="dashboard-goal-main"><strong>{data.today.minutes}<small> min</small></strong><span>{data.today.goalMinutes} min goal</span></div>
          <div className="dashboard-progress-track dashboard-goal-track"><span style={{ width: `${goalPercent}%` }} /></div>
          <p className="dashboard-card-footnote">{data.today.goalProgress === null ? 'Daily focus goal' : goalPercent >= 100 ? 'Daily goal complete — nice work.' : `${Math.max(0, data.today.goalMinutes! - data.today.minutes)} minutes to reach today’s goal.`}</p>
          <div className="dashboard-streak"><span className="dashboard-streak-icon"><Flame size={16} /></span><strong>{data.streak} day{data.streak === 1 ? '' : 's'}</strong><span>practice streak</span></div>
        </section>

        <section className="dashboard-card dashboard-trend-card" aria-labelledby="dashboard-trend-title">
          <div className="dashboard-card-heading"><div><span className="dashboard-card-kicker">AM I IMPROVING?</span><h3 id="dashboard-trend-title">Practice trend</h3></div>{data.accuracyChange === null ? <TrendingUp size={17} /> : data.accuracyChange >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}</div>
          <div className="dashboard-trend-value">{data.thisWeekAttempts}<span> questions this week</span></div>
          <p className={`dashboard-trend-note${data.accuracyChange !== null && data.accuracyChange < 0 ? ' is-down' : ''}`}>{formatAccuracyChange(data.accuracyChange)}</p>
          <Link className="dashboard-subtle-link" href={data.continueHref}>{data.hasStudyToContinue ? 'Continue studying' : 'Start a practice session'} <ArrowRight size={14} /></Link>
        </section>
      </div>

      <div className="dashboard-lower-grid">
        <section className="dashboard-card dashboard-performance-card" aria-labelledby="dashboard-performance-title">
          <div className="dashboard-card-heading dashboard-section-card-heading"><div><span className="dashboard-card-kicker">WHERE TO FOCUS</span><h3 id="dashboard-performance-title">Section performance</h3></div><Link href="/progress" aria-label="View all progress"><ArrowUpRight size={16} /></Link></div>
          <div className="dashboard-section-list">{data.sectionPerformance.map((section) => <div className="dashboard-section-row" key={section.id}>
            <div className="dashboard-section-row-heading"><strong>{section.name}</strong><span>{section.accuracy === null ? 'No attempts yet' : `${section.accuracy}% accuracy · ${section.attempts} ${section.attempts === 1 ? 'question' : 'questions'}`}</span></div>
            <div className="dashboard-progress-track"><span className={section.accuracy === null ? 'is-empty' : ''} style={{ width: `${section.accuracy ?? 0}%` }} /></div>
          </div>)}</div>
        </section>

        <section className="dashboard-card dashboard-weakness-card" aria-labelledby="dashboard-weakness-title">
          <div className="dashboard-card-heading dashboard-section-card-heading"><div><span className="dashboard-card-kicker">PERSONALIZED PRACTICE</span><h3 id="dashboard-weakness-title">Topics to strengthen</h3></div></div>
          {data.topicPerformance.length ? <div className="dashboard-weakness-list">{data.topicPerformance.slice(0, 3).map((topic) => <Link className="dashboard-weakness-row" href={topic.href} key={`${topic.section}-${topic.topic}`}>
            <span className="dashboard-weakness-copy"><strong>{topic.topic}</strong><small>{topic.section} · {topic.attempts} {topic.attempts === 1 ? 'attempt' : 'attempts'}</small></span><span className="dashboard-weakness-score">{topic.accuracy}%</span><ArrowRight size={14} />
          </Link>)}</div> : <p className="dashboard-empty-note">Topic insights will appear as you practice. Every answer helps make your recommendations more personal.</p>}
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-card dashboard-activity-card" aria-labelledby="dashboard-activity-title">
          <div className="dashboard-card-heading dashboard-section-card-heading"><div><span className="dashboard-card-kicker">YOUR CONSISTENCY</span><h3 id="dashboard-activity-title">Practice activity</h3></div><span className="dashboard-activity-range">Last 7 days</span></div>
          <div className="dashboard-activity-list" role="img" aria-label="Practice minutes during the last seven days">{data.activity.map((day) => <div className="dashboard-activity-day" key={day.date} title={`${day.minutes} minutes, ${day.questions} questions`}>
            <span className="dashboard-activity-minutes">{day.minutes ? `${day.minutes}m` : ''}</span><div className="dashboard-activity-bar"><span style={{ height: `${day.minutes ? Math.max(8, (day.minutes / maxActivity) * 100) : 0}%` }} /></div><span className="dashboard-activity-label">{day.label}</span>
          </div>)}</div>
        </section>

        <section className="dashboard-card dashboard-mistakes-card" aria-labelledby="dashboard-mistakes-title">
          <div className="dashboard-card-heading dashboard-section-card-heading"><div><span className="dashboard-card-kicker">LEARN FROM MISSES</span><h3 id="dashboard-mistakes-title">Recent mistakes</h3></div><Link href="/review">Review all <ArrowRight size={13} /></Link></div>
          {data.recentMistakes.length ? <div className="dashboard-mistake-list">{data.recentMistakes.map((mistake, index) => <Link className="dashboard-mistake-row" href={mistake.href} key={`${mistake.questionId}-${index}`}>
            <span className="dashboard-mistake-mark">{index + 1}</span><span><strong>{mistake.topic ?? mistake.section}</strong><small>{mistake.prompt}</small></span><ArrowRight size={14} />
          </Link>)}</div> : <p className="dashboard-empty-note">No missed questions yet. Keep practicing to build your review list.</p>}
        </section>
      </div>
    </div>
  );
}
