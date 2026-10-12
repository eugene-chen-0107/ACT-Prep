import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { demoAchievements, demoQuestions, demoSections, demoTopics } from './seed-data';
import type { QuestionType } from './schema';

const validQuestionTypes: QuestionType[] = ['multiple_choice', 'passage_based', 'data_interpretation', 'experiment_analysis'];

describe('ACT demo dataset', () => {
  it('covers the four ACT sections and attaches every topic to a known section', () => {
    assert.deepEqual(demoSections.map(({ id }) => id), ['english', 'math', 'reading', 'science']);
    const sectionIds = new Set<string>(demoSections.map(({ id }) => id));
    const topicIds = new Set(demoTopics.map(({ id }) => id));
    for (const topic of demoTopics) {
      assert.ok(sectionIds.has(topic.sectionId), `topic ${topic.id} has a known section`);
      assert.ok(topic.parentTopicId === null || topicIds.has(topic.parentTopicId), `topic ${topic.id} has a known parent`);
      if (topic.parentTopicId) {
        const parent = demoTopics.find(({ id }) => id === topic.parentTopicId);
        assert.equal(parent?.sectionId, topic.sectionId, `topic ${topic.id} has a parent in its section`);
      }
    }
    assert.ok(demoTopics.some(({ parentTopicId }) => parentTopicId !== null), 'taxonomy includes subtopics');
  });

  it('contains original, structurally valid, uniquely identified questions in every section', () => {
    const questionIds = new Set<string>();
    const questionSlugs = new Set<string>();
    const topicIds = new Set<string>(demoTopics.map(({ id }) => id));
    const sectionIds = new Set<string>(demoSections.map(({ id }) => id));
    const coveredSections = new Set<string>();

    for (const question of demoQuestions) {
      assert.ok(!questionIds.has(question.id), `unique question id: ${question.id}`);
      assert.ok(!questionSlugs.has(question.slug), `unique question slug: ${question.slug}`);
      questionIds.add(question.id);
      questionSlugs.add(question.slug);
      assert.ok(sectionIds.has(question.sectionId), `${question.slug} has a known section`);
      assert.ok(topicIds.has(question.topicId), `${question.slug} has a known topic`);
      assert.ok(topicIds.has(question.subtopicId), `${question.slug} has a known subtopic`);
      assert.equal(demoTopics.find(({ id }) => id === question.topicId)?.sectionId, question.sectionId);
      assert.equal(demoTopics.find(({ id }) => id === question.subtopicId)?.parentTopicId, question.topicId);
      assert.ok(question.estimatedTimeSeconds > 0);
      assert.ok(question.tags.length > 0);
      assert.ok(validQuestionTypes.includes(question.questionType));
      coveredSections.add(question.sectionId);
      assert.ok(question.prompt.length > 10);
      assert.ok(question.explanation.length > 10);
      assert.ok(question.options.length >= 2);
      assert.equal(new Set(question.options.map(({ id }) => id)).size, question.options.length);
      assert.ok(question.options.some(({ id }) => id === question.correctAnswer), `${question.slug} answer is present in its choices`);
    }
    assert.equal(coveredSections.size, 4);
    for (const section of demoSections) {
      assert.ok(demoQuestions.filter(({ sectionId }) => sectionId === section.id).length >= 3, `${section.name} has at least three demo questions`);
    }
  });

  it('has stable achievement definitions suitable for idempotent seeding', () => {
    assert.ok(demoAchievements.length > 0);
    assert.equal(new Set(demoAchievements.map(({ key }) => key)).size, demoAchievements.length);
    assert.ok(demoAchievements.every(({ title, description }) => title.length > 0 && description.length > 0));
  });
});
