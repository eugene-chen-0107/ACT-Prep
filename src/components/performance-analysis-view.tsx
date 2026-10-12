import Link from 'next/link';
import { ArrowRight, Clock3, Repeat2, Target } from 'lucide-react';
import type { PerformanceAnalysis, PerformanceMetric } from '@/lib/performance-analysis';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatLastPracticed(value: string) {
  if (!value) return 'Not practiced yet';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

function metricRow(metric: PerformanceMetric) {
  return <div className="performance-row" key={metric.key}>
    <div className="performance-row-main">
      <strong>{metric.label}</strong>
      <span>{metric.attempts} {metric.attempts === 1 ? 'attempt' : 'attempts'} · {formatDuration(metric.averageTimeSeconds)} average</span>
    </div>
    <div className="performance-accuracy"><strong>{metric.accuracy === null ? '—' : `${metric.accuracy}%`}</strong><span>all time</span></div>
    <div className="performance-accuracy performance-recent"><strong>{metric.recentAccuracy === null ? '—' : `${metric.recentAccuracy}%`}</strong><span>last {metric.recentAttempts}</span></div>
    <div className="performance-mastery"><span className="performance-mastery-track"><i style={{ width: `${metric.masteryEstimate ?? 0}%` }} /></span><strong>{metric.masteryEstimate === null ? 'Building data' : `${metric.masteryEstimate}%`}</strong></div>
    <span className="performance-last-practiced">{formatLastPracticed(metric.lastPracticed)}</span>
    <span className="performance-repeat" title="Distinct questions missed at least once"><Repeat2 size={13} />{metric.repeatedMistakes}</span>
  </div>;
}

function MetricGroup({ title, metrics, emptyMessage }: { title: string; metrics: PerformanceMetric[]; emptyMessage: string }) {
  return <section className="performance-card">
    <div className="performance-card-heading"><h3>{title}</h3><span>{metrics.length} {metrics.length === 1 ? 'area' : 'areas'}</span></div>
    {metrics.length ? <div className="performance-table-wrap">
      <div className="performance-table-head" aria-hidden="true"><span>Skill</span><span>Accuracy</span><span>Recent</span><span>Mastery</span><span>Last practiced</span><span>Misses</span></div>
      <div className="performance-rows">{metrics.map(metricRow)}</div>
    </div> : <p className="performance-empty">{emptyMessage}</p>}
  </section>;
}

const questionTypeLabels: Record<string, string> = {
  multiple_choice: 'Multiple choice',
  passage_based: 'Passage based',
  data_interpretation: 'Data interpretation',
  experiment_analysis: 'Experiment analysis',
};

export function PerformanceAnalysisView({ analysis }: { analysis: PerformanceAnalysis }) {
  const topicGroups = analysis.sections.map((section) => ({
    section,
    topics: analysis.topics.filter((topic) => topic.section === section.label),
  })).filter(({ topics }) => topics.length);
  const subtopicGroups = analysis.topics.map((topic) => ({
    topic,
    subtopics: analysis.subtopics.filter((subtopic) => subtopic.section === topic.section && subtopic.topic === topic.label),
  })).filter(({ subtopics }) => subtopics.length);
  const questionTypes = analysis.questionTypes.map((metric) => ({
    ...metric,
    label: questionTypeLabels[metric.label] ?? metric.label,
  }));

  return <main className="performance-page">
    <header className="performance-heading">
      <div><span className="performance-eyebrow">YOUR LEARNING SIGNALS</span><h2>Performance analysis</h2><p>See what’s clicking, what needs a little more work, and how your practice is changing.</p></div>
      <Link href="/practice" className="performance-practice-link">Practice a skill <ArrowRight size={15} /></Link>
    </header>

    <section className="performance-overview" aria-labelledby="performance-overall-title">
      <div className="performance-overview-icon"><Target size={21} /></div>
      <div className="performance-overview-copy"><span className="performance-eyebrow">OVERALL</span><h3 id="performance-overall-title">{analysis.totalAttempts} answered {analysis.totalAttempts === 1 ? 'question' : 'questions'}</h3><p>Accuracy and timing are calculated from saved attempts across your ACT prep.</p></div>
      <div className="performance-overview-stat"><strong>{analysis.overall.accuracy === null ? '—' : `${analysis.overall.accuracy}%`}</strong><span>historical accuracy</span></div>
      <div className="performance-overview-stat"><strong>{analysis.overall.recentAccuracy === null ? '—' : `${analysis.overall.recentAccuracy}%`}</strong><span>last {analysis.overall.recentAttempts} attempts</span></div>
      <div className="performance-overview-stat"><strong>{formatDuration(analysis.overall.averageTimeSeconds)}</strong><span>average time</span></div>
    </section>

    <div className="performance-key" aria-label="Metric definitions"><span><i className="performance-key-dot performance-key-dot--recent" />Recent = last {analysis.methodology.recentWindow} attempts</span><span><i className="performance-key-dot performance-key-dot--mastery" />Mastery blends recent ({Math.round(analysis.methodology.recentWeight * 100)}%) and historical ({Math.round(analysis.methodology.historicalWeight * 100)}%) accuracy; requires {analysis.methodology.masteryMinimumAttempts} attempts</span></div>

    {analysis.sections.length ? <div className="performance-dimension-stack">
      <MetricGroup title="Section performance" metrics={analysis.sections} emptyMessage="Section data appears after your first submitted answer." />
      {topicGroups.map(({ section, topics }) => <MetricGroup key={section.key} title={`${section.label} · Topics`} metrics={topics} emptyMessage="No topic attempts yet." />)}
      {subtopicGroups.map(({ topic, subtopics }) => <MetricGroup key={`${topic.key}-subtopics`} title={`${topic.section} · ${topic.label} · Subtopics`} metrics={subtopics} emptyMessage="No subtopic attempts yet." />)}
      <div className="performance-two-column">
        <MetricGroup title="Difficulty" metrics={analysis.difficulties} emptyMessage="Difficulty data appears as you answer questions." />
        <MetricGroup title="Question type" metrics={questionTypes} emptyMessage="Question-type data appears as you answer questions." />
      </div>
    </div> : <section className="performance-empty-state"><span className="performance-overview-icon"><Clock3 size={19} /></span><h3>Your performance picture starts with practice.</h3><p>Answer questions and we’ll build an honest picture from your attempts—no invented stats.</p><Link href="/practice" className="performance-practice-link">Start practicing <ArrowRight size={15} /></Link></section>}

    <section className="performance-card performance-mistakes-card">
      <div className="performance-card-heading"><div><h3>Repeated mistakes</h3><p>The same question missed multiple times, surfaced for review.</p></div><span>{analysis.repeatedMistakes.length} questions</span></div>
      {analysis.repeatedMistakes.length ? <div className="performance-mistake-list">{analysis.repeatedMistakes.map((mistake) => <div className="performance-mistake" key={mistake.questionId}><div><strong>{mistake.topic ?? mistake.section}</strong><span>{mistake.prompt}</span></div><span className="performance-mistake-count">Missed {mistake.incorrectAttempts} times</span></div>)}</div> : <p className="performance-empty">No repeated mistakes detected yet.</p>}
    </section>
    <p className="performance-footnote">Mastery is a practice signal, not an official ACT score. Updated {formatLastPracticed(analysis.analyzedAt)}.</p>
  </main>;
}
