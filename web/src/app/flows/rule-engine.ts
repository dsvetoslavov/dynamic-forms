import { FlowRule } from './flows.service';

/**
 * Evaluate flow rules against an answer context and return the set of enabled question IDs.
 *
 * Copy of the BE rule engine (api/src/flow-runs/rule-engine.ts).
 *
 * Questions not targeted by any relevant rule are always enabled.
 * Targeted questions start disabled and become enabled when a matching rule fires.
 */
export function evaluateRules(
  rules: FlowRule[],
  answerContext: Record<string, string>,
  currentFormQuestionIds: string[],
): Set<string> {
  const currentIds = new Set(currentFormQuestionIds);
  const relevantRules = rules.filter((r) => currentIds.has(r.targetQuestionId));
  const targetIds = new Set(relevantRules.map((r) => r.targetQuestionId));
  const enabled = new Set(
    currentFormQuestionIds.filter((id) => !targetIds.has(id)),
  );

  for (const rule of relevantRules) {
    if (enabled.has(rule.targetQuestionId)) continue;
    const answer = answerContext[rule.sourceQuestionId] ?? '';
    if (ruleMatches(rule, answer)) {
      enabled.add(rule.targetQuestionId);
    }
  }

  return enabled;
}

function ruleMatches(rule: FlowRule, answer: string): boolean {
  return answer.toLowerCase().includes(rule.triggerValue.toLowerCase());
}
