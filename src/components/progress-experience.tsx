"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  BookOpenCheck,
  Clock3,
  Target,
  TrendingUp,
} from "lucide-react";
import type { StudentProgressAnalytics } from "@/lib/progress-data";

function accuracyText(value: number | null) {
  return value === null ? "Not available" : `${value}%`;
}
function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return remainingSeconds && minutes < 1
    ? `${remainingSeconds}s`
    : `${minutes}m`;
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
function Change({ value }: { value: number | null }) {
  if (value === null)
    return (
      <span className="progress-change is-neutral">Need more answers</span>
    );
  if (value === 0)
    return <span className="progress-change is-neutral">No change</span>;
  return (
    <span className={`progress-change ${value > 0 ? "is-up" : "is-down"}`}>
      {value > 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
      {Math.abs(value)} pts
    </span>
  );
}

function LineChart({
  points,
  mode,
}: {
  points: Array<{ label: string; value: number | null; detail: string }>;
  mode: "score" | "accuracy";
}) {
  if (!points.length)
    return (
      <p className="progress-empty-note">
        Complete another diagnostic or practice test to see your score change
        over time.
      </p>
    );
  const values = points
    .map(({ value }) => value)
    .filter((value): value is number => value !== null);
  if (!values.length)
    return (
      <p className="progress-empty-note">
        There isn’t enough recorded data to draw this trend yet.
      </p>
    );
  const low = mode === "score" ? Math.max(1, Math.min(...values) - 3) : 0;
  const high = mode === "score" ? Math.min(36, Math.max(...values) + 3) : 100;
  const range = Math.max(1, high - low);
  const width = 620;
  const height = 188;
  const insetX = 20;
  const insetY = 14;
  const coords = points.map((point, index) => ({
    ...point,
    x:
      points.length === 1
        ? width / 2
        : insetX + index * ((width - insetX * 2) / (points.length - 1)),
    y:
      height -
      insetY -
      (((point.value ?? low) - low) / range) * (height - insetY * 2),
  }));
  const line = coords
    .map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`)
    .join(" ");
  return (
    <div className="progress-line-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          mode === "score"
            ? "Estimated ACT score progression"
            : "Weekly practice accuracy progression"
        }
      >
        <line
          x1={insetX}
          y1={height - insetY}
          x2={width - insetX}
          y2={height - insetY}
          className="progress-chart-axis"
        />
        {[0, 1, 2, 3].map((index) => {
          const y = insetY + index * ((height - insetY * 2) / 3);
          const value = Math.round(high - (index * range) / 3);
          return (
            <g key={index}>
              <line
                x1={insetX}
                y1={y}
                x2={width - insetX}
                y2={y}
                className="progress-chart-grid"
              />
              <text x="0" y={y + 3} className="progress-chart-y-label">
                {value}
                {mode === "accuracy" ? "%" : ""}
              </text>
            </g>
          );
        })}
        <path d={line} className="progress-chart-path" />
        {coords.map((point) => (
          <g key={`${point.label}-${point.detail}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              className="progress-chart-point"
            >
              <title>
                {point.value ?? "No score"} · {point.detail}
              </title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="progress-chart-labels">
        {coords.map(({ label, detail, value }, index) => (
          <span key={`${label}-${index}`}>
            <strong>
              {value ?? "—"}
              {mode === "accuracy" && value !== null ? "%" : ""}
            </strong>
            <small>{label}</small>
            <small>{detail}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProgressExperience({
  analytics,
}: {
  analytics: StudentProgressAnalytics;
}) {
  const scorePoints = analytics.scoreHistory.map((point) => ({
    label: dateLabel(point.date),
    value: point.score,
    detail: point.source === "diagnostic" ? "Diagnostic estimate" : point.label,
  }));
  const accuracyPoints = analytics.accuracyTrend.map((point) => ({
    label: point.label,
    value: point.accuracy,
    detail: `${point.attempts} ${point.attempts === 1 ? "answer" : "answers"}`,
  }));
  const latestScore = analytics.latestScore;
  const recent = analytics.recentPerformance;
  const recommended = analytics.nextPractice;

  return (
    <main className="progress-page">
      <header className="progress-heading">
        <div>
          <p className="progress-eyebrow">YOUR ACT LEARNING STORY</p>
          <h1>Progress</h1>
          <p>
            See what changed, where your practice is working, and what to focus
            on next.
          </p>
        </div>
        <Link href="/study-plan" className="progress-plan-link">
          <Target size={15} /> Study plan <ArrowRight size={14} />
        </Link>
      </header>

      {!analytics.hasPracticeData ? (
        <section className="progress-empty-state">
          <span>
            <BarChart3 size={21} />
          </span>
          <h2>Your progress starts with your first answer</h2>
          <p>
            Your score progression, topic mastery, accuracy trends, and practice
            time will use saved diagnostic and practice results. We won’t fill
            the page with made-up numbers.
          </p>
          <div>
            <Link href="/diagnostic">
              Take a diagnostic <ArrowRight size={15} />
            </Link>
            <Link href="/practice">
              Start practicing <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="progress-summary" aria-label="Progress summary">
            <article>
              <span>
                <Target size={14} /> LATEST SCORE ESTIMATE
              </span>
              <strong>{latestScore ? `${latestScore.score}/36` : "—"}</strong>
              <small>
                {latestScore
                  ? `${latestScore.source === "diagnostic" ? "Diagnostic estimate" : latestScore.label} · ${dateLabel(latestScore.date)}`
                  : "Take a diagnostic or scored practice test"}
              </small>
              {analytics.scoreChange !== null && (
                <Change value={analytics.scoreChange} />
              )}
            </article>
            <article>
              <span>
                <BookOpenCheck size={14} /> QUESTIONS ANSWERED
              </span>
              <strong>
                {analytics.summary.questionsAnswered.toLocaleString()}
              </strong>
              <small>
                {analytics.summary.uniqueQuestions.toLocaleString()} distinct
                questions · {analytics.summary.practiceQuestions} practice ·{" "}
                {analytics.summary.testQuestions} test ·{" "}
                {analytics.summary.diagnosticQuestions} diagnostic
              </small>
            </article>
            <article>
              <span>
                <Clock3 size={14} /> RECORDED STUDY TIME
              </span>
              <strong>
                {duration(analytics.summary.totalTrackedTimeSeconds)}
              </strong>
              <small>
                {duration(analytics.summary.practiceTimeSeconds)} practice ·{" "}
                {duration(analytics.summary.testTimeSeconds)} test ·{" "}
                {duration(analytics.summary.diagnosticTimeSeconds)} diagnostic
              </small>
            </article>
            <article>
              <span>
                <TrendingUp size={14} /> LAST 10 ANSWERS
              </span>
              <strong>{accuracyText(recent.accuracy)}</strong>
              <small>
                {recent.correct} correct out of {recent.attempts}
                {recent.from && recent.to
                  ? ` · ${dateLabel(recent.from)}–${dateLabel(recent.to)}`
                  : ""}
              </small>
            </article>
          </section>

          <section className="progress-chart-grid">
            <article className="progress-panel">
              <header>
                <div>
                  <p className="progress-eyebrow">SCORE HISTORY</p>
                  <h2>Estimated ACT progression</h2>
                </div>
                <span className="progress-chart-tag">1–36 scale</span>
              </header>
              <p className="progress-panel-intro">
                Only completed diagnostics and scored practice tests appear
                here. Practice accuracy is not converted into a score.
              </p>
              <LineChart points={scorePoints} mode="score" />
              {analytics.scoreHistory.length === 1 && (
                <p className="progress-caveat">
                  One estimate is a baseline, not a progression. Complete
                  another scored assessment to compare.
                </p>
              )}
            </article>
            <article className="progress-panel">
              <header>
                <div>
                  <p className="progress-eyebrow">PRACTICE QUALITY</p>
                  <h2>Accuracy over time</h2>
                </div>
                <span className="progress-chart-tag">Weekly</span>
              </header>
              <p className="progress-panel-intro">
                Answer accuracy grouped by practice week; diagnostic responses
                are excluded from this trend.
              </p>
              <LineChart points={accuracyPoints} mode="accuracy" />
              {!accuracyPoints.length && (
                <p className="progress-caveat">
                  Practice a few questions this week to start an accuracy trend.
                </p>
              )}
            </article>
          </section>

          <section className="progress-panel progress-section-panel">
            <header>
              <div>
                <p className="progress-eyebrow">SECTION PROGRESSION</p>
                <h2>How each ACT section is changing</h2>
              </div>
            </header>
            <p className="progress-panel-intro">
              Compare diagnostic estimates and section scores from completed
              practice tests. Answer accuracy remains separate.
            </p>
            {analytics.sectionScoreHistory.length ? (
              <div className="progress-section-history">
                {analytics.sectionProgress.map((section) => {
                  const points = analytics.sectionScoreHistory.filter(
                    (point) => point.section === section.section,
                  );
                  const first = points[0];
                  const last = points.at(-1);
                  const change =
                    first && last && points.length > 1
                      ? last.score - first.score
                      : null;
                  return (
                    <article key={section.section}>
                      <div className="progress-section-info">
                        <strong>{section.section}</strong>
                        <span>
                          {section.attempts
                            ? `${section.attempts} answered questions · ${accuracyText(section.accuracy)} accuracy`
                            : "Section response accuracy appears after saved answers"}
                        </span>
                        <small>
                          {first && last && points.length > 1
                            ? `${first.score} → ${last.score} score estimate`
                            : first
                              ? `${first.score} baseline estimate · another scored assessment will show change`
                              : "No scored section estimate yet"}
                        </small>
                      </div>
                      <Change value={change} />
                      {first && last && points.length > 1 && (
                        <span className="progress-section-score">
                          {first.score}
                          <i />
                          <strong>{last.score}</strong>
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="progress-empty-note">
                Section estimates will appear here after a diagnostic or scored
                practice test.
              </p>
            )}
          </section>

          <section className="progress-lower-grid">
            <article className="progress-panel">
              <header>
                <div>
                  <p className="progress-eyebrow">TOPIC MASTERY</p>
                  <h2>Skills to strengthen</h2>
                </div>
                <span className="progress-chart-tag">
                  {analytics.topicMastery.length} topics
                </span>
              </header>
              <p className="progress-panel-intro">
                Based on actual correct answers; mastery is shown only after{" "}
                {analytics.analysis.methodology.masteryMinimumAttempts}{" "}
                attempts.
              </p>
              {analytics.topicMastery.length ? (
                <div className="progress-topic-list">
                  {analytics.topicMastery.slice(0, 8).map((topic) => (
                    <div
                      className="progress-topic-row"
                      key={`${topic.section}-${topic.topic}`}
                    >
                      <div className="progress-topic-copy">
                        <strong>{topic.topic}</strong>
                        <small>
                          {topic.section} · {topic.attempts}{" "}
                          {topic.attempts === 1 ? "answer" : "answers"}
                          {topic.mastery === null
                            ? " · building sample"
                            : ` · ${topic.mastery}% mastery`}
                        </small>
                      </div>
                      <div className="progress-topic-accuracy">
                        <span>{accuracyText(topic.accuracy)}</span>
                        <i>
                          <b style={{ width: `${topic.accuracy ?? 0}%` }} />
                        </i>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="progress-empty-note">
                  Topic mastery will appear as you answer questions with topic
                  data.
                </p>
              )}
            </article>
            <article className="progress-panel">
              <header>
                <div>
                  <p className="progress-eyebrow">WHAT CHANGED</p>
                  <h2>Real accuracy changes</h2>
                </div>
              </header>
              {analytics.changes.length ? (
                <div className="progress-change-list">
                  {analytics.changes.slice(0, 6).map((change) => (
                    <div key={`${change.section}-${change.topic}`}>
                      <div>
                        <strong>
                          {change.topic} accuracy: {change.previousAccuracy}% →{" "}
                          {change.recentAccuracy}%
                        </strong>
                        <small>
                          {change.section} · {change.previousAttempts} earlier
                          answers vs {change.recentAttempts} recent answers
                        </small>
                      </div>
                      <Change value={change.change} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="progress-empty-note">
                  Topic changes need at least 6 answers in the same skill, split
                  into two comparable groups of up to 10. Keep practicing and
                  we’ll show meaningful before-and-after changes.
                </p>
              )}
            </article>
          </section>

          <section className="progress-action-panel">
            <header>
              <div>
                <p className="progress-eyebrow">YOUR NEXT PRACTICE</p>
                <h2>What to focus on next</h2>
              </div>
              <Link href="/smart-practice">
                Build a session <ArrowRight size={14} />
              </Link>
            </header>
            {recommended.length ? (
              <div className="progress-recommendations">
                {recommended.map((topic) => (
                  <article key={`${topic.section}-${topic.topic}`}>
                    <div>
                      <span>{topic.section}</span>
                      <h3>{topic.topic}</h3>
                      <p>{topic.reason}</p>
                    </div>
                    <span className="progress-recommendation-accuracy">
                      {accuracyText(topic.accuracy)}
                      <small>accuracy</small>
                    </span>
                    <Link href={topic.practiceHref}>
                      Practice <ArrowRight size={14} />
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="progress-empty-note">
                No topic below 70% with at least two answers yet. Keep
                practicing; your next steps will be based on actual skill
                results.
              </p>
            )}
          </section>
        </>
      )}
      <p className="progress-footnote">
        Diagnostic estimates use the app’s stated approximate scale and are not
        official ACT scores. Practice accuracy describes your saved answers, not
        an ACT composite score.
      </p>
    </main>
  );
}
