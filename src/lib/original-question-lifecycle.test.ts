import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertQuestionLifecycleTransition } from './original-question-lifecycle';

describe('original question lifecycle', () => {
  it('allows the approved and rejected state paths', () => {
    assert.doesNotThrow(() => assertQuestionLifecycleTransition('GENERATED', 'VALIDATING'));
    assert.doesNotThrow(() => assertQuestionLifecycleTransition('VALIDATING', 'APPROVED'));
    assert.doesNotThrow(() => assertQuestionLifecycleTransition('APPROVED', 'AVAILABLE'));
    assert.doesNotThrow(() => assertQuestionLifecycleTransition('VALIDATING', 'REJECTED'));
    assert.doesNotThrow(() => assertQuestionLifecycleTransition('REJECTED', 'REGENERATE'));
    assert.doesNotThrow(() => assertQuestionLifecycleTransition('REGENERATE', 'GENERATED'));
  });

  it('prevents bypassing validation or reversing an available question', () => {
    assert.throws(() => assertQuestionLifecycleTransition('GENERATED', 'APPROVED'), /Invalid generated-question lifecycle/);
    assert.throws(() => assertQuestionLifecycleTransition('APPROVED', 'GENERATED'), /Invalid generated-question lifecycle/);
    assert.throws(() => assertQuestionLifecycleTransition('AVAILABLE', 'REGENERATE'), /Invalid generated-question lifecycle/);
  });
});
