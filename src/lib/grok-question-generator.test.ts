import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GrokOriginalQuestionGenerator } from './grok-question-generator';
import type { QuestionGenerationInput } from './ai-question-generation';

const input: QuestionGenerationInput = {
  section: 'Reading', topic: 'Central Ideas', subtopic: null, difficulty: 'medium',
  questionType: 'passage_based', targetSkill: 'Identify a passage-supported main idea',
  estimatedTimeSeconds: 90, studentWeakness: 'Chooses an answer that is too broad.',
};

const responseContent = {
  question: 'Which statement best summarizes the short passage?',
  passage: 'Mina recorded bird calls at sunrise for a week. The number of calls varied, but the same two species appeared each morning.',
  choices: [
    { id: 'A', text: 'Mina observed a consistent pair of bird species during a week of changing call counts.' },
    { id: 'B', text: 'All bird species call only at sunrise.' },
    { id: 'C', text: 'The number of calls increased each day.' },
    { id: 'D', text: 'Mina studied birds for an entire year.' },
  ],
  correctAnswer: 'A',
  explanation: 'The passage states that call counts varied while the same two species appeared each morning.',
  incorrectAnswerExplanations: [
    { choiceId: 'B', explanation: 'The passage describes one observation, not all species.' },
    { choiceId: 'C', explanation: 'The counts varied; no steady increase is stated.' },
    { choiceId: 'D', explanation: 'The observation lasted one week, not a year.' },
  ],
  concept: 'Main idea and scope',
};

describe('Grok original question provider', () => {
  it('sends structured requirements to the server API without storing prompts', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const provider = new GrokOriginalQuestionGenerator({
      apiKey: 'server-test-key',
      model: 'grok-test',
      fetcher: async (inputUrl, init) => {
        requestUrl = String(inputUrl);
        requestInit = init;
        return new Response(JSON.stringify({
          status: 'completed',
          output: [{ content: [{ type: 'output_text', text: JSON.stringify(responseContent) }] }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });

    assert.equal(provider.available, true);
    assert.deepEqual(await provider.generate(input), responseContent);
    assert.equal(requestUrl, 'https://api.x.ai/v1/responses');
    const sent = JSON.parse(String(requestInit?.body));
    assert.equal(sent.model, 'grok-test');
    assert.equal(sent.store, false);
    assert.equal(sent.text.format.type, 'json_schema');
    assert.match(sent.input[0].content, /Never copy, paraphrase, reconstruct/);
    assert.match(sent.input[1].content, /Identify a passage-supported main idea/);
    assert.match(String((requestInit?.headers as Record<string, string>).authorization), /server-test-key/);
  });

  it('fails explicitly when credentials or completed structured output are missing', async () => {
    const unavailable = new GrokOriginalQuestionGenerator({ apiKey: '' });
    assert.equal(unavailable.available, false);
    await assert.rejects(unavailable.generate(input), /not configured/);

    const incomplete = new GrokOriginalQuestionGenerator({
      apiKey: 'server-test-key',
      fetcher: async () => new Response(JSON.stringify({ status: 'incomplete', output: [] }), { status: 200 }),
    });
    await assert.rejects(incomplete.generate(input), /did not complete/);
  });
});
