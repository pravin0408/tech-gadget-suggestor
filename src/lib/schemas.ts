import { z } from 'zod';

// ── Form Factor Schema ───────────────────────────────────────────
export const FormFactorSchema = z.enum(['smartphone', 'laptop', 'tablet']);

// ── Use Case Schema ──────────────────────────────────────────────
export const UseCaseSchema = z.enum([
  'general', 'gaming', 'creative', 'development',
  'business', 'student', 'content-consumption'
]);

// ── OS Preference Schema ─────────────────────────────────────────
export const OSPreferenceSchema = z.enum([
  'ios', 'android', 'windows', 'macos', 'linux', 'chromeos', 'no-preference'
]);

// ── Region Schema ────────────────────────────────────────────────
export const RegionSchema = z.enum(['us', 'eu', 'in', 'uk', 'global']);

// ── Battery Priority Schema ──────────────────────────────────────
export const BatteryPrioritySchema = z.enum(['all-day', 'moderate', 'plugged-in']);

// ── Budget Range Schema (anti-injection: strict numeric bounds) ──
export const BudgetSchema = z.object({
  min: z.number().int().min(0).max(50000),
  max: z.number().int().min(50).max(50000),
}).refine(data => data.max >= data.min, {
  message: 'Maximum budget must be greater than or equal to minimum budget',
  path: ['max'],
});

// ── Brand Preference (sanitized strings, max length 50, max 5) ───
export const BrandPreferenceSchema = z.array(
  z.string().trim().min(1).max(50).regex(/^[a-zA-Z0-9\s\-]+$/, 'Invalid brand name characters')
).max(5).default([]);

// ── Full Wizard Submission Schema ────────────────────────────────
export const WizardSubmissionSchema = z.object({
  formFactor: FormFactorSchema,
  useCases: z.array(UseCaseSchema).min(1).max(3),
  budgetMin: z.number().int().min(0).max(50000),
  budgetMax: z.number().int().min(50).max(50000),
  currency: z.string().length(3).default('USD'),
  osPreference: OSPreferenceSchema,
  batteryPriority: BatteryPrioritySchema,
  region: RegionSchema,
  brandPreferences: BrandPreferenceSchema,
}).refine(data => data.budgetMax >= data.budgetMin, {
  message: 'Maximum budget must be greater than or equal to minimum budget',
  path: ['budgetMax'],
});

// Export the inferred type
export type WizardSubmission = z.infer<typeof WizardSubmissionSchema>;

// ── Validation helper with user-friendly errors ──────────────────
export function validateWizardInput(data: unknown): {
  success: boolean;
  data?: WizardSubmission;
  errors?: Array<{ field: string; message: string }>;
} {
  const result = WizardSubmissionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  return { success: false, errors };
}

// ── Smart conflict detection ─────────────────────────────────────
// Returns user-friendly guidance when constraints conflict
export function detectConstraintConflicts(data: WizardSubmission): string[] {
  const warnings: string[] = [];
  
  // Budget too low for gaming laptop
  if (data.formFactor === 'laptop' && data.useCases.includes('gaming') && data.budgetMax < 800) {
    warnings.push('Gaming laptops with dedicated GPUs typically start around $800. We will show the best options at your budget, but consider increasing to $900+ for a significantly better gaming experience.');
  }
  
  // Budget too low for creative laptop
  if (data.formFactor === 'laptop' && data.useCases.includes('creative') && data.budgetMax < 900) {
    warnings.push('High-end creative workflows (4K video editing, 3D rendering) benefit from at least $900+ machines. We will include refurbished options and the best performers at your budget.');
  }
  
  // iOS with laptop/tablet that isn't Apple ecosystem
  if (data.osPreference === 'ios' && data.formFactor === 'laptop') {
    warnings.push('iOS is not available on laptops. We will show macOS options from Apple which integrate seamlessly with the iOS ecosystem.');
  }
  
  // Android with laptop
  if (data.osPreference === 'android' && data.formFactor === 'laptop') {
    warnings.push('Android laptops are very limited. We will show ChromeOS options (which can run Android apps) and Linux alternatives.');
  }
  
  // Budget too low for any smartphone  
  if (data.formFactor === 'smartphone' && data.budgetMax < 150) {
    warnings.push('At this budget, options are limited to prepaid and last-generation devices. Consider increasing to $200+ for significantly more capable devices.');
  }

  // All-day battery with gaming  
  if (data.batteryPriority === 'all-day' && data.useCases.includes('gaming')) {
    warnings.push('All-day battery life and heavy gaming create a natural tension. Gaming-optimized devices tend to sacrifice battery for performance. We will prioritize balanced options.');
  }

  return warnings;
}
