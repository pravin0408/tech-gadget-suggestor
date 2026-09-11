// ── Form Factor ──────────────────────────────────────────────────
export type FormFactor = 'smartphone' | 'laptop' | 'tablet';

// ── Use Cases ────────────────────────────────────────────────────
export type UseCase =
  | 'general'
  | 'gaming'
  | 'creative'       // video editing, 3D, design
  | 'development'    // coding, DevOps
  | 'business'       // office, presentations
  | 'student'        // note-taking, light multitask
  | 'content-consumption'; // streaming, reading

// ── OS Preference ────────────────────────────────────────────────
export type OSPreference = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'chromeos' | 'no-preference';

// ── Region (for pricing / availability) ──────────────────────────
export type Region = 'us' | 'eu' | 'in' | 'uk' | 'global';

// ── Battery Priority ─────────────────────────────────────────────
export type BatteryPriority = 'all-day' | 'moderate' | 'plugged-in';

// ── Wizard step state ────────────────────────────────────────────
export interface WizardState {
  step: number;          // 0-3
  formFactor: FormFactor | null;
  useCases: UseCase[];
  budgetMin: number;
  budgetMax: number;
  currency: string;
  osPreference: OSPreference;
  batteryPriority: BatteryPriority;
  region: Region;
  brandPreferences: string[];   // optional brand include/exclude
}

// ── Lifecycle Position ───────────────────────────────────────────
export type LifecyclePosition = 'just-launched' | 'mid-cycle' | 'end-of-life' | 'upcoming';

// ── Device / Product ─────────────────────────────────────────────
export interface DeviceSpec {
  id: string;
  name: string;
  brand: string;
  formFactor: FormFactor;
  os: string;
  releaseDate: string;             // ISO date
  msrp: number;
  streetPrice: number;
  currency: string;
  processor: string;
  processorGeneration: string;     // e.g., "Apple M4 Pro", "Snapdragon 8 Elite Gen 2"
  ramGb: number;
  storageGb: number;
  storageExpandable: boolean;
  displaySize: number;             // inches
  displayResolution: string;       // e.g., "2560x1600"
  displayType: string;             // OLED, IPS LCD, etc.
  displayRefreshRate: number;      // Hz
  batteryMah: number;
  batteryLifeHours: number;        // estimated
  weight: number;                  // grams
  cameras?: string;
  connectivity: string[];          // WiFi 7, 5G, etc.
  biometrics: string[];            // Face ID, Fingerprint
  repairabilityScore?: number;     // 1-10
  thermalNotes?: string;           // throttling warnings
  lifecyclePosition: LifecyclePosition;
  expectedSuccessorDate?: string;  // ISO date
  region: Region[];
  imageUrl?: string;
}

// ── Recommendation Result ────────────────────────────────────────
export interface Recommendation {
  device: DeviceSpec;
  overallScore: number;          // 0-100 weighted composite
  scores: {
    performance: number;         // 0-100
    battery: number;
    portability: number;
    valueForMoney: number;
    displayQuality: number;
    futureProofing: number;
  };
  pros: string[];
  cons: string[];                // honest trade-offs
  buyingAdvice: string;          // lifecycle-aware guidance
  alternativeId?: string;        // lower-cost runner-up
  tags: string[];                // e.g., "Best Value", "Editor's Pick"
}

// ── API Response Envelope ────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  meta: {
    timestamp: string;           // ISO
    runtimeYear: number;         // always 2026
    requestId: string;
  };
}

// ── Rate Limit Info ──────────────────────────────────────────────
export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: string;               // ISO timestamp
}

// ── Wizard Step Metadata ─────────────────────────────────────────
export interface WizardStepMeta {
  index: number;
  title: string;
  description: string;
  icon: string;                  // lucide icon name
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  { index: 0, title: 'Form Factor', description: 'What type of device are you looking for?', icon: 'Smartphone' },
  { index: 1, title: 'Primary Use', description: 'How will you primarily use this device?', icon: 'Target' },
  { index: 2, title: 'Budget & Constraints', description: 'Set your budget and preferences.', icon: 'DollarSign' },
  { index: 3, title: 'Ecosystem', description: 'Choose your preferred platform and region.', icon: 'Globe' },
];
