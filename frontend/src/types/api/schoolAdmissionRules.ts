// School Admission Rules API Types - Match Laravel API response (snake_case)

/** Section labels for the rules page (student profile PDF). Keys e.g. commitments_title, guarantee_title */
export type SchoolAdmissionRulesLabels = Record<string, string>;

export interface SchoolAdmissionRules {
  commitment_items: string[];
  guarantee_text: string;
  labels?: SchoolAdmissionRulesLabels;
}

export type SchoolAdmissionRulesUpdate = {
  commitment_items: string[];
  guarantee_text: string;
  labels?: SchoolAdmissionRulesLabels;
};
