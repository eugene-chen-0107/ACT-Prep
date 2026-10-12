import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adaptPendingStudyTasks, generateWeeklyStudyPlan, getStudyWeekStart, summarizeStudyPlanProgress, type StudyPlanSkill } from './study-plan-engine';
const futureTestDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const skills: StudyPlanSkill[] = [
  { section: 'Math', topic: 'Algebra', accuracy: 82, attempts: 12, source: 'performance' },
  { section: 'Math', topic: 'Functions', accuracy: 46, attempts: 8, source: 'performance' },
  { section: 'English', topic: 'Punctuation', accuracy: 58, attempts: 3, source: 'performance' },
  { section: 'Reading', topic: 'Main Ideas', accuracy: 35, attempts: 0, source: 'diagnostic' },
];

describe('adaptive weekly study plan', () => {
  it('schedules only selected days and respects time budget', () => {
    const result = generateWeeklyStudyPlan({
      targetScore: 30, currentPerformance: { Math: 22 }, diagnosticPerformance: { English: 24 },
      testDate: futureTestDate(), daysAvailable: ['Monday', 'Wednesday', 'Friday'], minutesPerDay: 15, skills,
    }, new Date());
    assert.deepEqual(result.tasks.map(({ day }) => day), result.daysAvailable.filter((day) => {
      const planned = new Date(`${result.startDate}T12:00:00`);
      planned.setDate(planned.getDate() + ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day));
      return planned.toISOString().slice(0, 10) >= new Date().toISOString().slice(0, 10);
    }));
    assert.ok(result.tasks.every(({ minutes }) => minutes <= 15 && minutes > 0));
    assert.equal(result.daysAvailable.join(','), 'Monday,Wednesday,Friday');
    assert.equal(result.tasks.at(-1)?.topic, 'Mixed Review');
    assert.equal(result.adaptsToPerformance, true);
  });

  it('prioritizes a weak skill, then lowers its priority after improvement', () => {
    const input = { targetScore: 30, currentPerformance: { Math: 23 }, testDate: futureTestDate(), daysAvailable: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], minutesPerDay: 15 };
    const algebraWeak = skills.map((skill) => skill.topic === 'Algebra' ? { ...skill, accuracy: 5, attempts: 4 } : skill);
    const before = generateWeeklyStudyPlan({ ...input, skills: algebraWeak }, new Date('2026-10-12T12:00:00Z'));
    const improvedSkills = algebraWeak.map((skill) => skill.topic === 'Algebra' ? { ...skill, accuracy: 99, attempts: 14 } : skill);
    const after = generateWeeklyStudyPlan({ ...input, skills: improvedSkills }, new Date('2026-10-12T12:00:00Z'));
    assert.equal(before.tasks[0].topic, 'Algebra');
    assert.equal(after.tasks[0].topic, 'Main Ideas');
    assert.ok(after.tasks.every(({ topic }) => topic !== 'Algebra'));
  });

  it('preserves completed/skipped tasks while adapting pending tasks to current weaknesses', () => {
    const tasks = [
      { status: 'pending', section: 'Math', topic: 'Algebra', estimatedMinutes: 10 },
      { status: 'completed', section: 'Math', topic: 'Algebra' },
      { status: 'skipped', section: 'Math', topic: 'Algebra' },
      { status: 'pending', section: 'English', topic: 'Punctuation', estimatedMinutes: 10 },
    ];
    const improved = skills.map((skill) => skill.topic === 'Functions' ? { ...skill, accuracy: 90, attempts: 20 } : skill);
    const result = adaptPendingStudyTasks(tasks, improved, 8);
    assert.deepEqual(result[1], tasks[1]);
    assert.deepEqual(result[2], tasks[2]);
    assert.equal(result[0].topic, 'Main Ideas');
    assert.equal(result[3].topic, 'Punctuation');
    assert.equal(result[0].estimatedMinutes, 240);
  });

  it('calculates daily and Monday-to-Sunday weekly progress', () => {
    const now = new Date('2026-10-14T12:00:00');
    assert.equal(getStudyWeekStart(now).getDay(), 1);
    const progress = summarizeStudyPlanProgress([
      { status: 'completed', taskDate: '2026-10-14T12:00:00', estimatedMinutes: 15 },
      { status: 'pending', taskDate: '2026-10-14T12:00:00', estimatedMinutes: 20 },
      { status: 'skipped', taskDate: '2026-10-15T12:00:00', estimatedMinutes: 30 },
      { status: 'pending', taskDate: '2026-10-20T12:00:00', estimatedMinutes: 10 },
    ], now);
    assert.deepEqual(progress.daily, { total: 2, completed: 1, minutes: 35 });
    assert.deepEqual(progress.weekly, { total: 2, completed: 1, minutes: 35 });
  });

  it('validates intake bounds and rejects unavailable weekday selections', () => {
    assert.throws(() => generateWeeklyStudyPlan({ targetScore: 40, currentPerformance: {}, testDate: futureTestDate(), daysAvailable: ['Monday'], minutesPerDay: 15, skills }), /Target score/);
    assert.throws(() => generateWeeklyStudyPlan({ targetScore: 28, currentPerformance: {}, testDate: 'invalid', daysAvailable: ['Monday'], minutesPerDay: 15, skills }), /valid test date/);
    assert.throws(() => generateWeeklyStudyPlan({ targetScore: 28, currentPerformance: {}, testDate: futureTestDate(), daysAvailable: [], minutesPerDay: 15, skills }), /at least one/);
  });
});
