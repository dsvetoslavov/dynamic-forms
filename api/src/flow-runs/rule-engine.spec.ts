import { evaluateRules } from './rule-engine';
import { Rule } from '../flows/entities/rule.entity';

function makeRule(overrides: Partial<Rule>): Rule {
  return {
    id: 'rule-1',
    flowId: 'flow-1',
    sourceQuestionId: 'src-q1',
    operator: '=',
    triggerValue: 'yes',
    targetQuestionId: 'tgt-q1',
    actionType: 'enable_target',
    ...overrides,
  } as Rule;
}

describe('evaluateRules', () => {
  it('enables all questions when there are no rules', () => {
    const result = evaluateRules([], {}, ['q1', 'q2', 'q3']);
    expect(result).toEqual(new Set(['q1', 'q2', 'q3']));
  });

  it('enables target when rule matches', () => {
    const rules = [makeRule({ sourceQuestionId: 'q1', targetQuestionId: 'q2' })];
    const result = evaluateRules(rules, { q1: 'yes' }, ['q1', 'q2']);
    expect(result).toEqual(new Set(['q1', 'q2']));
  });

  it('keeps target disabled when rule does not match', () => {
    const rules = [makeRule({ sourceQuestionId: 'q1', targetQuestionId: 'q2' })];
    const result = evaluateRules(rules, { q1: 'no' }, ['q1', 'q2']);
    expect(result).toEqual(new Set(['q1']));
  });

  it('enables target via cross-form rule (source on prior form)', () => {
    const rules = [makeRule({ sourceQuestionId: 'form1-q1', targetQuestionId: 'form2-q1' })];
    const context = { 'form1-q1': 'yes' };
    const result = evaluateRules(rules, context, ['form2-q1', 'form2-q2']);
    expect(result).toEqual(new Set(['form2-q1', 'form2-q2']));
  });

  it('keeps target disabled when cross-form source has no answer', () => {
    const rules = [makeRule({ sourceQuestionId: 'form1-q1', targetQuestionId: 'form2-q1' })];
    const result = evaluateRules(rules, {}, ['form2-q1', 'form2-q2']);
    expect(result).toEqual(new Set(['form2-q2']));
  });

  it('matches with contains operator', () => {
    const rules = [
      makeRule({
        sourceQuestionId: 'q1',
        targetQuestionId: 'q2',
        operator: 'contains',
        triggerValue: 'red',
      }),
    ];
    const result = evaluateRules(rules, { q1: 'red,blue,green' }, ['q1', 'q2']);
    expect(result).toEqual(new Set(['q1', 'q2']));
  });

  it('matches case-insensitively', () => {
    const rules = [makeRule({ sourceQuestionId: 'q1', targetQuestionId: 'q2', triggerValue: 'YES' })];
    const result = evaluateRules(rules, { q1: 'yes' }, ['q1', 'q2']);
    expect(result).toEqual(new Set(['q1', 'q2']));
  });

  it('enables target when any of multiple rules match', () => {
    const rules = [
      makeRule({ id: 'r1', sourceQuestionId: 'q1', targetQuestionId: 'q3', triggerValue: 'a' }),
      makeRule({ id: 'r2', sourceQuestionId: 'q2', targetQuestionId: 'q3', triggerValue: 'b' }),
    ];
    const result = evaluateRules(rules, { q1: 'nope', q2: 'b' }, ['q1', 'q2', 'q3']);
    expect(result).toEqual(new Set(['q1', 'q2', 'q3']));
  });

  it('ignores rules targeting questions not on the current form', () => {
    const rules = [makeRule({ sourceQuestionId: 'q1', targetQuestionId: 'other-form-q' })];
    const result = evaluateRules(rules, { q1: 'yes' }, ['q1', 'q2']);
    expect(result).toEqual(new Set(['q1', 'q2']));
  });

  it('keeps all targeted questions disabled with empty answer context', () => {
    const rules = [
      makeRule({ id: 'r1', sourceQuestionId: 'q1', targetQuestionId: 'q2' }),
      makeRule({ id: 'r2', sourceQuestionId: 'q1', targetQuestionId: 'q3' }),
    ];
    const result = evaluateRules(rules, {}, ['q1', 'q2', 'q3']);
    expect(result).toEqual(new Set(['q1']));
  });
});
