import { assessTokenRisk, type AssessmentDependencies } from "../domain/assessment.js";
import type { RiskAssessment } from "../domain/evidence.js";

export function createAssessTokenRiskHandler(dependencies: AssessmentDependencies = {}) {
  return async ({ tokenAddress }: { tokenAddress: string }) => {
    const assessment = await assessTokenRisk(tokenAddress, dependencies);
    return {
      content: [{ type: "text" as const, text: summarize(assessment) }],
      structuredContent: assessment,
    };
  };
}

function summarize(assessment: RiskAssessment): string {
  const blockerCodes = assessment.blockers.map((item) => item.code).join(", ") || "none";
  const warningCodes = assessment.warnings.map((item) => item.code).join(", ") || "none";
  const gapCodes = assessment.coverage.gaps.map((item) => item.code).join(", ") || "none";
  return [
    `RugRadar assessment for ${assessment.token.address} on Base: ${assessment.verdict}.`,
    `Policy ${assessment.policyVersion}; coverage ${assessment.coverage.level}.`,
    `Blockers: ${blockerCodes}. Warnings: ${warningCodes}. Evidence gaps: ${gapCodes}.`,
    "This is automated risk evidence, not a guarantee that the token is safe.",
  ].join("\n");
}
