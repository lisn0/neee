import type { FieldKey, SourceInput } from "../types";

export const FIELD_ORDER: FieldKey[] = [
  "title",
  "population",
  "intervention_comparator",
  "outcomes",
  "evidence_summary",
  "recommendation_statement",
  "justification",
  "references",
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  title: "Title",
  population: "Population",
  intervention_comparator: "Intervention / Comparator",
  outcomes: "Outcomes",
  evidence_summary: "Evidence Summary",
  recommendation_statement: "Recommendation Statement",
  justification: "Justification",
  references: "References",
};

export const DEMO_SOURCE: SourceInput = {
  type: "abstract",
  title:
    "OnabotulinumtoxinA for the preventive treatment of episodic migraine: Results from the phase 3, multicenter randomized, double-blind, placebo-controlled phase of the PRECLUDE trial",
  source_id: "PMID:41091731",
  text:
    "The PRECLUDE trial is a phase 3, multicenter, randomized, double-blind, placebo-controlled, parallel-group trial. " +
    "Patients were 18-65 years of age with a history of episodic migraine attacks. " +
    "Intervention arms included onabotulinumtoxinA 155 U and 195 U compared with placebo. " +
    "The primary endpoint examined change from baseline in monthly migraine days during months 5 and 6. " +
    "Secondary endpoints included headache days, 50% responder rate, rescue medication use, and patient-reported outcomes. " +
    "The results showed that there was no significant difference; the drug did not meaningfully reduce migraine days better than placebo.",
};
