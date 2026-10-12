import type { OriginalGeneratedQuestion, QuestionGenerationInput } from './ai-question-generation';

export type QuestionLifecycle = 'GENERATED' | 'VALIDATING' | 'APPROVED' | 'AVAILABLE' | 'REJECTED' | 'REGENERATE';
export type ValidationCheck = { name: string; status: 'passed' | 'failed' | 'not_applicable'; details: string };
export type SemanticQuestionReview = {
  exactlyOneCorrectAnswer: boolean;
  correctAnswerSolves: boolean;
  allChoicesValid: boolean;
  noContradictions: boolean;
  noAmbiguousWording: boolean;
  noAnswerLeakage: boolean;
  correctTopic: boolean;
  appropriateDifficulty: boolean;
  explanationCorrect: boolean;
  original: boolean;
  notes: string[];
};
export interface OriginalQuestionReviewer {
  review(input: QuestionGenerationInput, question: OriginalGeneratedQuestion): Promise<SemanticQuestionReview>;
}
export type QuestionValidationResult = { passed: boolean; checks: ValidationCheck[]; errors: string[] };

function normalizeText(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function numericChoice(value: string): number | null {
  const cleaned = value.trim().replace(/[$,]/g, '').replace(/\s+/g, '');
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(cleaned)) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}
function deterministicMathAnswer(question: OriginalGeneratedQuestion): { expected: number; method: string } | null {
  if (question.section !== 'Math') return null;
  const text = `${question.question}\n${question.passage ?? ''}\n${question.explanation}`;
  const equalGroups = text.match(/(\d+)\s+equal\s+groups?[\s\S]{0,120}?(\d+)\s+[a-z]+\s+altogether/i);
  if (equalGroups) {
    const groups = Number(equalGroups[1]);
    const total = Number(equalGroups[2]);
    const expected = total / groups;
    if (groups !== 0 && Number.isFinite(expected)) return { expected, method: 'Divided the explicit total by the number of equal groups.' };
  }
  const equation = text.match(/(-?\d+(?:\.\d+)?)\s*([a-z])\s*=\s*(-?\d+(?:\.\d+)?)/i);
  if (equation) {
    const coefficient = Number(equation[1]);
    const expected = Number(equation[3]) / coefficient;
    if (coefficient !== 0 && Number.isFinite(expected)) return { expected, method: 'Solved the explicit one-variable multiplication equation.' };
  }
  const expression = text.match(/(-?\d+(?:\.\d+)?)\s*([+−\-×*/÷])\s*(-?\d+(?:\.\d+)?)(?:\s*=\s*\?|\s*=\s*what)?/);
  if (!expression) return null;
  const left = Number(expression[1]);
  const right = Number(expression[3]);
  const operator = expression[2];
  const expected = operator === '+' ? left + right
    : operator === '-' || operator === '−' ? left - right
      : operator === '×' || operator === '*' ? left * right
        : operator === '÷' || operator === '/' ? right === 0 ? Number.NaN : left / right
          : Number.NaN;
  return Number.isFinite(expected) ? { expected, method: 'Recomputed the explicit arithmetic expression.' } : null;
}

const leakagePattern = /\b(?:the\s+)?correct\s+(?:answer|choice|option)\s+(?:is|=|:)|\banswer\s*[:=]\s*[A-D]\b|\bselect\s+[A-D]\s+as\s+the\s+answer\b/i;
const officialQuestionPattern = /\b(?:official|authentic|real)\s+(?:ACT\s+)?(?:exam\s+)?question\b/i;

export async function validateOriginalQuestion(
  input: QuestionGenerationInput,
  question: OriginalGeneratedQuestion,
  reviewer: OriginalQuestionReviewer | null,
  options: { existingFingerprints?: ReadonlySet<string> } = {},
): Promise<QuestionValidationResult> {
  const checks: ValidationCheck[] = [];
  const add = (name: string, status: ValidationCheck['status'], details: string) => checks.push({ name, status, details });
  const choiceIds = question.choices.map(({ id }) => id);
  const choiceTexts = question.choices.map(({ text }) => normalizeText(text));
  const idsValid = choiceIds.length === 4 && new Set(choiceIds).size === 4 && ['A', 'B', 'C', 'D'].every((id) => choiceIds.includes(id));
  add('formatting', idsValid && question.choices.every(({ text }) => text.trim().length > 0) ? 'passed' : 'failed', 'Requires exactly four nonempty, uniquely labeled A–D choices.');
  const answerCount = choiceIds.filter((id) => id === question.correctAnswer).length;
  add('exactly_one_correct_answer', answerCount === 1 ? 'passed' : 'failed', 'The answer key must identify exactly one available choice.');
  const choicesValid = new Set(choiceTexts).size === choiceTexts.length && choiceTexts.every(Boolean);
  add('all_choices_valid', choicesValid ? 'passed' : 'failed', 'Choices must be nonempty and distinct after normalization.');

  const questionText = `${question.question}\n${question.passage ?? ''}`;
  const allText = `${questionText}\n${question.explanation}\n${question.choices.map(({ text }) => text).join('\n')}`;
  const leaked = leakagePattern.test(questionText) || officialQuestionPattern.test(allText);
  add('no_answer_leakage', leaked ? 'failed' : 'passed', leaked ? 'The prompt/context contains an explicit answer-key or official-question claim.' : 'No explicit answer-key leakage or official-question claim was found in the prompt/context.');

  const answer = question.choices.find(({ id }) => id === question.correctAnswer);
  const math = deterministicMathAnswer(question);
  if (math) {
    const markedValue = answer ? numericChoice(answer.text) : null;
    const explanationSupports = question.explanation.includes(String(math.expected));
    const mathPass = markedValue !== null && Math.abs(markedValue - math.expected) < 1e-9 && explanationSupports;
    add('deterministic_math', mathPass ? 'passed' : 'failed', mathPass ? math.method : `Expected ${math.expected} from deterministic solving, and the marked choice/explanation did not agree.`);
  } else {
    add('deterministic_math', input.section === 'Math' ? 'not_applicable' : 'not_applicable', input.section === 'Math' ? 'No supported explicit arithmetic form was detected; the independent semantic reviewer must verify the solution.' : 'Not a Math-section question.');
  }

  const fingerprint = normalizeText(`${question.question}\n${question.passage ?? ''}\n${question.choices.map(({ text }) => text).join('\n')}`);
  const originalEnough = fingerprint.length > 0 && !options.existingFingerprints?.has(fingerprint);
  add('originality', originalEnough ? 'passed' : 'failed', originalEnough ? 'No exact normalized duplicate was found in the supplied generated-question corpus.' : 'This question duplicates an existing generated question.');

  if (!reviewer) {
    add('semantic_review', 'failed', 'Independent semantic review is not configured.');
  } else {
    try {
      const review = await reviewer.review(input, question);
      const semanticChecks: Array<[keyof SemanticQuestionReview, string]> = [
        ['exactlyOneCorrectAnswer', 'exactly_one_correct_answer_semantic'], ['correctAnswerSolves', 'correct_answer_solves'],
        ['allChoicesValid', 'choices_semantically_valid'], ['noContradictions', 'no_contradictions'],
        ['noAmbiguousWording', 'unambiguous_wording'], ['noAnswerLeakage', 'no_answer_leakage_semantic'],
        ['correctTopic', 'correct_topic'], ['appropriateDifficulty', 'appropriate_difficulty'],
        ['explanationCorrect', 'explanation_correct'], ['original', 'originality_semantic'],
      ];
      for (const [field, name] of semanticChecks) {
        const passed = review[field] === true;
        const note = review.notes.join(' ').trim();
        add(name, passed ? 'passed' : 'failed', note || (passed ? 'Independent semantic review passed.' : 'Independent semantic review rejected this criterion.'));
      }
    } catch {
      add('semantic_review', 'failed', 'Independent semantic review failed to complete.');
    }
  }
  const errors = checks.filter(({ status }) => status === 'failed').map(({ name, details }) => `${name}: ${details}`);
  return { passed: errors.length === 0, checks, errors };
}
