// School Admission Rules Domain Types - UI-friendly structure (camelCase)

/** Section labels for the rules page (student profile PDF). Keys e.g. commitments_title, guarantee_title */
export type SchoolAdmissionRulesLabels = Record<string, string>;

export interface SchoolAdmissionRules {
  commitmentItems: string[];
  guaranteeText: string;
  labels?: SchoolAdmissionRulesLabels;
}

export type SchoolAdmissionRulesUpdate = {
  commitmentItems: string[];
  guaranteeText: string;
  labels?: SchoolAdmissionRulesLabels;
};
