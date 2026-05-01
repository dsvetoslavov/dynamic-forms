import { Rule } from '../forms/entities/rule.entity';

/**
 * Evaluate flow rules against an answer context and return the set of enabled question IDs.
 *
 * Rules are linear (form N → form N+1). Only rules targeting questions on the
 * current form are considered. Source questions may be on prior forms — their
 * values are looked up in answerContext.
 *
 * Questions not targeted by any relevant rule are always enabled.
 * Targeted questions start disabled and become enabled when a matching rule fires.
 */
export function evaluateRules(
  rules: Rule[],
  answerContext: Record<string, string>,
  currentFormQuestionIds: string[],
): Set<string> {
  const currentIds = new Set(currentFormQuestionIds);
  const relevantRules = rules.filter((r) => currentIds.has(r.targetQuestionId));
  const targetIds = new Set(relevantRules.map((r) => r.targetQuestionId));
  const enabled = new Set(currentFormQuestionIds.filter((id) => !targetIds.has(id)));

  for (const rule of relevantRules) {
    if (enabled.has(rule.targetQuestionId)) continue;
    const answer = answerContext[rule.sourceQuestionId] ?? '';
    if (ruleMatches(rule, answer)) {
      enabled.add(rule.targetQuestionId);
    }
  }

  return enabled;
}

function ruleMatches(rule: Rule, answer: string): boolean {
  return answer.toLowerCase().includes(rule.triggerValue.toLowerCase());
}
