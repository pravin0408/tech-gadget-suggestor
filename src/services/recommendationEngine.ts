import type {
  DeviceSpec,
  Recommendation,
  UseCase,
  FormFactor,
  BatteryPriority,
} from '../types/index';
import {
  getLifecycleAdvice,
} from '../lib/temporal';
import { DEVICE_CATALOG_2026 } from '../data/devices2026';

// ── Weight profiles per use case ─────────────────────────────────
// Each use case assigns different weights to scoring dimensions
interface WeightProfile {
  performance: number;
  battery: number;
  portability: number;
  valueForMoney: number;
  displayQuality: number;
  futureProofing: number;
}

const USE_CASE_WEIGHTS: Record<UseCase, WeightProfile> = {
  general: {
    performance: 0.15,
    battery: 0.2,
    portability: 0.2,
    valueForMoney: 0.25,
    displayQuality: 0.1,
    futureProofing: 0.1,
  },
  gaming: {
    performance: 0.35,
    battery: 0.05,
    portability: 0.05,
    valueForMoney: 0.15,
    displayQuality: 0.25,
    futureProofing: 0.15,
  },
  creative: {
    performance: 0.3,
    battery: 0.1,
    portability: 0.1,
    valueForMoney: 0.15,
    displayQuality: 0.2,
    futureProofing: 0.15,
  },
  development: {
    performance: 0.25,
    battery: 0.15,
    portability: 0.15,
    valueForMoney: 0.2,
    displayQuality: 0.1,
    futureProofing: 0.15,
  },
  business: {
    performance: 0.1,
    battery: 0.25,
    portability: 0.25,
    valueForMoney: 0.2,
    displayQuality: 0.1,
    futureProofing: 0.1,
  },
  student: {
    performance: 0.1,
    battery: 0.25,
    portability: 0.2,
    valueForMoney: 0.3,
    displayQuality: 0.05,
    futureProofing: 0.1,
  },
  'content-consumption': {
    performance: 0.05,
    battery: 0.25,
    portability: 0.2,
    valueForMoney: 0.2,
    displayQuality: 0.25,
    futureProofing: 0.05,
  },
};

// ── Processor tier classification ────────────────────────────────
// Returns a tier value 1-5 from a processor string, where 5 is flagship

const FLAGSHIP_PATTERNS = [
  /m4\s*max/i,
  /m5\s*pro/i,
  /m5\s*max/i,
  /m5\s*ultra/i,
  /snapdragon\s*8\s*elite\s*gen\s*2/i,
  /snapdragon\s*8\s*elite/i,
  /i9[- ]1[4-9]/i,
  /ryzen\s*9\s*(9|[1-9]\d{3})/i,
  /core\s*ultra\s*9/i,
  /dimensity\s*9400/i,
  /a1[89]\s*pro/i,
  /exynos\s*2[6-9]00/i,
];

const HIGH_END_PATTERNS = [
  /m4\s*pro/i,
  /m4(?!\s*(pro|max|ultra))/i,
  /m5(?!\s*(pro|max|ultra))/i,
  /snapdragon\s*8\s*gen\s*[3-9]/i,
  /i7[- ]1[4-9]/i,
  /ryzen\s*7\s*(9|[1-9]\d{3})/i,
  /core\s*ultra\s*7/i,
  /dimensity\s*9[2-3]00/i,
  /a1[89](?!\s*pro)/i,
  /exynos\s*2[4-5]00/i,
  /snapdragon\s*7\+\s*gen\s*[3-9]/i,
];

const MID_RANGE_PATTERNS = [
  /m3(?!\s*(pro|max|ultra))/i,
  /m3\s*pro/i,
  /snapdragon\s*7\s*gen\s*[3-9]/i,
  /snapdragon\s*7s\s*gen\s*[3-9]/i,
  /i5[- ]1[4-9]/i,
  /ryzen\s*5\s*(9|[1-9]\d{3})/i,
  /core\s*ultra\s*5/i,
  /dimensity\s*8[0-9]00/i,
  /tensor\s*g[4-9]/i,
  /a1[67]/i,
];

const ENTRY_PATTERNS = [
  /m2(?!\s*(pro|max|ultra))/i,
  /snapdragon\s*[4-6]\s*gen/i,
  /i3[- ]1[4-9]/i,
  /ryzen\s*3/i,
  /dimensity\s*[6-7][0-9]00/i,
  /helio\s*g/i,
  /a1[0-5]/i,
  /pentium/i,
  /celeron/i,
  /mediatek\s*kompanio/i,
];

function getProcessorTier(processor: string): number {
  const proc = processor.trim();
  for (const pattern of FLAGSHIP_PATTERNS) {
    if (pattern.test(proc)) return 5;
  }
  for (const pattern of HIGH_END_PATTERNS) {
    if (pattern.test(proc)) return 4;
  }
  for (const pattern of MID_RANGE_PATTERNS) {
    if (pattern.test(proc)) return 3;
  }
  for (const pattern of ENTRY_PATTERNS) {
    if (pattern.test(proc)) return 2;
  }
  return 1; // unknown / very budget
}

// ── Scoring functions ────────────────────────────────────────────

/** Score performance based on processor generation, RAM, and storage */
function scorePerformance(device: DeviceSpec, useCases: UseCase[]): number {
  const tier = getProcessorTier(device.processorGeneration);

  // Base score from processor tier (0-100 scale)
  let base: number;
  switch (tier) {
    case 5:
      base = 90;
      break;
    case 4:
      base = 72;
      break;
    case 3:
      base = 55;
      break;
    case 2:
      base = 35;
      break;
    default:
      base = 20;
  }

  // RAM bonus (relative to form factor expectations)
  let ramBonus = 0;
  if (device.formFactor === 'laptop') {
    if (device.ramGb >= 64) ramBonus = 8;
    else if (device.ramGb >= 32) ramBonus = 6;
    else if (device.ramGb >= 16) ramBonus = 3;
    else if (device.ramGb >= 8) ramBonus = 0;
    else ramBonus = -5;
  } else if (
    device.formFactor === 'smartphone' ||
    device.formFactor === 'tablet'
  ) {
    if (device.ramGb >= 16) ramBonus = 8;
    else if (device.ramGb >= 12) ramBonus = 5;
    else if (device.ramGb >= 8) ramBonus = 2;
    else if (device.ramGb >= 6) ramBonus = 0;
    else ramBonus = -3;
  }

  // Storage bonus
  let storageBonus = 0;
  if (device.storageGb >= 2048) storageBonus = 4;
  else if (device.storageGb >= 1024) storageBonus = 3;
  else if (device.storageGb >= 512) storageBonus = 2;
  else if (device.storageGb >= 256) storageBonus = 0;
  else storageBonus = -2;

  // Use-case specific bonus
  let useCaseBonus = 0;
  const procLower = device.processorGeneration.toLowerCase();

  if (useCases.includes('gaming')) {
    // Dedicated GPU keywords
    if (/rtx\s*[4-5]0[6-9]0/i.test(device.processor)) useCaseBonus += 5;
    if (/radeon\s*rx\s*[7-9]/i.test(device.processor)) useCaseBonus += 4;
    // High refresh rate helpful for gaming
    if (device.displayRefreshRate >= 144) useCaseBonus += 2;
    else if (device.displayRefreshRate >= 120) useCaseBonus += 1;
  }

  if (useCases.includes('creative')) {
    // Apple Silicon excels in creative tasks
    if (/m[4-5]\s*(pro|max|ultra)/i.test(procLower)) useCaseBonus += 4;
    // High RAM matters for creative
    if (device.ramGb >= 32) useCaseBonus += 3;
  }

  if (useCases.includes('development')) {
    // More RAM for VMs and containers
    if (device.ramGb >= 32) useCaseBonus += 3;
    else if (device.ramGb >= 16) useCaseBonus += 1;
    // Large storage for repos and tools
    if (device.storageGb >= 1024) useCaseBonus += 2;
  }

  const raw = base + ramBonus + storageBonus + useCaseBonus;
  return Math.max(0, Math.min(100, raw));
}

/** Score battery life (normalized to 0-100) */
function scoreBattery(device: DeviceSpec, priority: BatteryPriority): number {
  const hours = device.batteryLifeHours;

  if (priority === 'plugged-in') {
    // Battery barely matters; almost everything scores well
    if (hours >= 6) return 90;
    if (hours >= 4) return 75;
    if (hours >= 2) return 60;
    return 50;
  }

  if (priority === 'all-day') {
    // Demanding: need 10h+ to score well, 15h+ is excellent
    if (hours >= 20) return 100;
    if (hours >= 15) return 92;
    if (hours >= 12) return 80;
    if (hours >= 10) return 65;
    if (hours >= 8) return 45;
    if (hours >= 6) return 30;
    return 15;
  }

  // moderate priority
  if (hours >= 15) return 100;
  if (hours >= 12) return 90;
  if (hours >= 10) return 80;
  if (hours >= 8) return 65;
  if (hours >= 6) return 50;
  if (hours >= 4) return 35;
  return 20;
}

/** Score portability (weight + screen size consideration) */
function scorePortability(device: DeviceSpec): number {
  const w = device.weight; // grams

  if (device.formFactor === 'smartphone') {
    if (w < 160) return 98;
    if (w < 180) return 92;
    if (w < 200) return 85;
    if (w < 220) return 72;
    if (w < 250) return 60;
    return 45;
  }

  if (device.formFactor === 'tablet') {
    if (w < 400) return 95;
    if (w < 500) return 88;
    if (w < 600) return 75;
    if (w < 700) return 62;
    if (w < 800) return 50;
    return 35;
  }

  // laptop
  if (w < 1000) return 95;
  if (w < 1200) return 90;
  if (w < 1400) return 82;
  if (w < 1600) return 72;
  if (w < 1800) return 62;
  if (w < 2000) return 52;
  if (w < 2500) return 38;
  return 22;
}

/** Score value for money (price vs specs ratio) */
function scoreValue(device: DeviceSpec, budgetMax: number): number {
  const price = device.streetPrice;
  const procTier = getProcessorTier(device.processorGeneration);

  // If the device is over budget, penalize proportionally
  if (price > budgetMax) {
    const overflowPct = ((price - budgetMax) / budgetMax) * 100;
    // Allow 15% overflow at reduced score; beyond that, heavy penalty
    if (overflowPct <= 15) {
      // Mild penalty: lose 1 point per % overflow
      return Math.max(20, 60 - overflowPct * 1.5);
    }
    return Math.max(5, 40 - overflowPct);
  }

  // Price-to-performance ratio (higher tier per dollar = better value)
  // Normalize: a tier-5 device at $500 is amazing value
  const tierPerDollar = (procTier / price) * 1000;

  let base: number;
  if (tierPerDollar >= 8) base = 95;
  else if (tierPerDollar >= 5) base = 85;
  else if (tierPerDollar >= 3) base = 72;
  else if (tierPerDollar >= 2) base = 60;
  else if (tierPerDollar >= 1) base = 48;
  else base = 35;

  // Discount bonus: reward street price below MSRP
  const discountPct =
    device.msrp > 0
      ? ((device.msrp - device.streetPrice) / device.msrp) * 100
      : 0;
  let discountBonus = 0;
  if (discountPct >= 20) discountBonus = 8;
  else if (discountPct >= 10) discountBonus = 5;
  else if (discountPct >= 5) discountBonus = 2;

  // RAM/storage value addon
  let specBonus = 0;
  if (device.formFactor === 'laptop') {
    if (device.ramGb >= 16 && price < 1000) specBonus += 4;
    if (device.storageGb >= 512 && price < 800) specBonus += 3;
  } else {
    if (device.ramGb >= 8 && price < 600) specBonus += 4;
    if (device.storageGb >= 256 && price < 500) specBonus += 3;
  }

  // Budget headroom bonus: the further under budget, the better value
  const headroomPct = ((budgetMax - price) / budgetMax) * 100;
  let headroomBonus = 0;
  if (headroomPct >= 40) headroomBonus = 6;
  else if (headroomPct >= 20) headroomBonus = 3;
  else if (headroomPct >= 10) headroomBonus = 1;

  const raw = base + discountBonus + specBonus + headroomBonus;
  return Math.max(0, Math.min(100, raw));
}

/** Score display quality */
function scoreDisplay(device: DeviceSpec): number {
  let score = 50; // baseline

  // Display type bonuses
  const dtype = device.displayType.toLowerCase();
  if (dtype.includes('oled') || dtype.includes('amoled')) {
    score += 20;
  } else if (dtype.includes('mini-led') || dtype.includes('miniled')) {
    score += 15;
  } else if (dtype.includes('ltpo')) {
    score += 12; // LTPO usually on OLED but just in case
  } else if (dtype.includes('ips')) {
    score += 5;
  } else if (dtype.includes('tn')) {
    score -= 5;
  }

  // Refresh rate bonus
  if (device.displayRefreshRate >= 240) score += 12;
  else if (device.displayRefreshRate >= 165) score += 10;
  else if (device.displayRefreshRate >= 120) score += 7;
  else if (device.displayRefreshRate >= 90) score += 3;
  // 60Hz is baseline, no bonus

  // Pixel density calculation (PPI)
  const resParts = device.displayResolution.split('x').map(Number);
  if (resParts.length === 2 && resParts[0] > 0 && resParts[1] > 0) {
    const diagPixels = Math.sqrt(
      resParts[0] * resParts[0] + resParts[1] * resParts[1]
    );
    const ppi = diagPixels / device.displaySize;

    if (ppi >= 500) score += 10;
    else if (ppi >= 400) score += 8;
    else if (ppi >= 300) score += 5;
    else if (ppi >= 220) score += 2;
    else if (ppi < 150) score -= 5;
  }

  // Size bonus for content consumption (larger = better for tablets/laptops)
  if (
    device.formFactor === 'tablet' ||
    device.formFactor === 'laptop'
  ) {
    if (device.displaySize >= 16) score += 3;
    else if (device.displaySize >= 14) score += 2;
  }

  return Math.max(0, Math.min(100, score));
}

/** Score future-proofing based on lifecycle position, RAM, storage, connectivity */
function scoreFutureProofing(device: DeviceSpec): number {
  let score = 50; // baseline

  // Lifecycle position is the most important signal
  switch (device.lifecyclePosition) {
    case 'just-launched':
      score += 35;
      break;
    case 'upcoming':
      score += 30;
      break;
    case 'mid-cycle':
      score += 10;
      break;
    case 'end-of-life':
      score -= 20;
      break;
  }

  // RAM future-proofing
  if (device.formFactor === 'laptop') {
    if (device.ramGb >= 32) score += 8;
    else if (device.ramGb >= 16) score += 4;
    else if (device.ramGb < 8) score -= 8;
  } else {
    if (device.ramGb >= 12) score += 8;
    else if (device.ramGb >= 8) score += 4;
    else if (device.ramGb < 6) score -= 5;
  }

  // Storage
  if (device.storageGb >= 1024) score += 4;
  else if (device.storageGb >= 512) score += 2;
  else if (device.storageGb < 128) score -= 5;

  // Expandable storage is a future-proofing advantage
  if (device.storageExpandable) score += 3;

  // Connectivity future-proofing
  const conn = device.connectivity.map((c) => c.toLowerCase());
  if (conn.some((c) => c.includes('wifi 7') || c.includes('wi-fi 7')))
    score += 5;
  else if (conn.some((c) => c.includes('wifi 6e') || c.includes('wi-fi 6e')))
    score += 3;

  if (conn.some((c) => c.includes('5g'))) score += 4;

  if (conn.some((c) => c.includes('usb4') || c.includes('usb 4')))
    score += 3;
  else if (
    conn.some(
      (c) =>
        c.includes('thunderbolt 4') ||
        c.includes('thunderbolt 5') ||
        c.includes('usb-c 3.2')
    )
  )
    score += 2;

  // Bluetooth 5.4+ is a minor bonus
  if (
    conn.some(
      (c) =>
        c.includes('bluetooth 5.4') ||
        c.includes('bluetooth 5.3') ||
        c.includes('bt 5.4')
    )
  )
    score += 1;

  // Processor generation (newer = better future proofing)
  const procTier = getProcessorTier(device.processorGeneration);
  if (procTier >= 4) score += 4;
  else if (procTier <= 2) score -= 3;

  return Math.max(0, Math.min(100, score));
}

/** Merge multiple use case weight profiles by averaging */
function mergeWeights(useCases: UseCase[]): WeightProfile {
  if (useCases.length === 0) {
    return USE_CASE_WEIGHTS.general;
  }

  if (useCases.length === 1) {
    return { ...USE_CASE_WEIGHTS[useCases[0]] };
  }

  const merged: WeightProfile = {
    performance: 0,
    battery: 0,
    portability: 0,
    valueForMoney: 0,
    displayQuality: 0,
    futureProofing: 0,
  };

  for (const uc of useCases) {
    const w = USE_CASE_WEIGHTS[uc];
    merged.performance += w.performance;
    merged.battery += w.battery;
    merged.portability += w.portability;
    merged.valueForMoney += w.valueForMoney;
    merged.displayQuality += w.displayQuality;
    merged.futureProofing += w.futureProofing;
  }

  const count = useCases.length;
  merged.performance /= count;
  merged.battery /= count;
  merged.portability /= count;
  merged.valueForMoney /= count;
  merged.displayQuality /= count;
  merged.futureProofing /= count;

  return merged;
}

/** Generate pros list for a device */
function generatePros(
  device: DeviceSpec,
  scores: Recommendation['scores']
): string[] {
  const pros: string[] = [];

  // Collect all scored dimensions and sort by score descending
  const dims: { key: string; score: number }[] = [
    { key: 'performance', score: scores.performance },
    { key: 'battery', score: scores.battery },
    { key: 'portability', score: scores.portability },
    { key: 'valueForMoney', score: scores.valueForMoney },
    { key: 'displayQuality', score: scores.displayQuality },
    { key: 'futureProofing', score: scores.futureProofing },
  ];
  dims.sort((a, b) => b.score - a.score);

  // Take the top 2-4 dimensions that score above 65
  const topDims = dims.filter((d) => d.score >= 65).slice(0, 4);

  for (const dim of topDims) {
    switch (dim.key) {
      case 'performance':
        if (scores.performance >= 85) {
          pros.push(
            `Flagship-grade ${device.processorGeneration} with ${device.ramGb}GB RAM delivers top-tier performance`
          );
        } else {
          pros.push(
            `Solid ${device.processorGeneration} processor handles demanding tasks well`
          );
        }
        break;

      case 'battery':
        if (device.batteryLifeHours >= 15) {
          pros.push(
            `Exceptional ${device.batteryLifeHours}-hour battery life lasts well beyond a full day`
          );
        } else if (device.batteryLifeHours >= 10) {
          pros.push(
            `Reliable ${device.batteryLifeHours}-hour battery comfortably covers a full workday`
          );
        } else {
          pros.push(
            `Adequate ${device.batteryLifeHours}-hour battery for most usage patterns`
          );
        }
        break;

      case 'portability':
        if (device.formFactor === 'laptop') {
          pros.push(
            `Lightweight ${(device.weight / 1000).toFixed(2)}kg design is easy to carry anywhere`
          );
        } else if (device.formFactor === 'smartphone') {
          pros.push(`Comfortable ${device.weight}g in-hand feel`);
        } else {
          pros.push(
            `Portable ${device.weight}g tablet is convenient for on-the-go use`
          );
        }
        break;

      case 'valueForMoney': {
        const savingsPct =
          device.msrp > 0
            ? Math.round(
                ((device.msrp - device.streetPrice) / device.msrp) * 100
              )
            : 0;
        if (savingsPct >= 10) {
          pros.push(
            `Great value at $${device.streetPrice} (${savingsPct}% below MSRP of $${device.msrp})`
          );
        } else {
          pros.push(
            `Strong specs-to-price ratio at $${device.streetPrice}`
          );
        }
        break;
      }

      case 'displayQuality': {
        const parts: string[] = [];
        if (
          device.displayType.toLowerCase().includes('oled') ||
          device.displayType.toLowerCase().includes('amoled')
        ) {
          parts.push(device.displayType);
        }
        if (device.displayRefreshRate >= 120) {
          parts.push(`${device.displayRefreshRate}Hz`);
        }
        parts.push(`${device.displaySize}" ${device.displayResolution}`);
        pros.push(`Stunning ${parts.join(' ')} display`);
        break;
      }

      case 'futureProofing':
        if (device.lifecyclePosition === 'just-launched') {
          pros.push(
            `Recently launched with years of software updates ahead`
          );
        } else {
          const futureFeatures: string[] = [];
          const conn = device.connectivity.map((c) => c.toLowerCase());
          if (
            conn.some(
              (c) => c.includes('wifi 7') || c.includes('wi-fi 7')
            )
          )
            futureFeatures.push('WiFi 7');
          if (conn.some((c) => c.includes('5g')))
            futureFeatures.push('5G');
          if (futureFeatures.length > 0) {
            pros.push(
              `Future-proofed with ${futureFeatures.join(' and ')} connectivity`
            );
          } else {
            pros.push(
              `Well-positioned in its lifecycle for continued support`
            );
          }
        }
        break;
    }
  }

  // Ensure at least 2 pros
  if (pros.length < 2) {
    if (!pros.some((p) => p.toLowerCase().includes('storage'))) {
      if (device.storageGb >= 512) {
        pros.push(`Generous ${device.storageGb}GB storage`);
      }
    }
    if (
      pros.length < 2 &&
      device.biometrics.length > 0
    ) {
      pros.push(
        `Secure authentication via ${device.biometrics.join(' and ')}`
      );
    }
  }

  return pros.slice(0, 4);
}

/** Generate cons list for a device (honest trade-offs) */
function generateCons(
  device: DeviceSpec,
  scores: Recommendation['scores']
): string[] {
  const cons: string[] = [];

  // Thermal notes are always a con if present
  if (device.thermalNotes) {
    cons.push(device.thermalNotes);
  }

  // Low-scoring dimensions
  const dims: { key: string; score: number }[] = [
    { key: 'performance', score: scores.performance },
    { key: 'battery', score: scores.battery },
    { key: 'portability', score: scores.portability },
    { key: 'valueForMoney', score: scores.valueForMoney },
    { key: 'displayQuality', score: scores.displayQuality },
    { key: 'futureProofing', score: scores.futureProofing },
  ];
  dims.sort((a, b) => a.score - b.score);

  // Take the lowest-scoring dimensions below 55
  const weakDims = dims.filter((d) => d.score < 55).slice(0, 2);

  for (const dim of weakDims) {
    switch (dim.key) {
      case 'performance':
        cons.push(
          `${device.processorGeneration} may struggle with heavy multitasking or demanding applications`
        );
        break;
      case 'battery':
        cons.push(
          `${device.batteryLifeHours}-hour battery may not last a full day of heavy use`
        );
        break;
      case 'portability':
        if (device.formFactor === 'laptop') {
          cons.push(
            `At ${(device.weight / 1000).toFixed(2)}kg, it's heavier than ultraportable alternatives`
          );
        } else {
          cons.push(
            `${device.weight}g weight is on the heavier side for its category`
          );
        }
        break;
      case 'valueForMoney':
        cons.push(
          `Premium pricing at $${device.streetPrice} may not suit budget-conscious buyers`
        );
        break;
      case 'displayQuality':
        if (device.displayRefreshRate <= 60) {
          cons.push(
            `${device.displayRefreshRate}Hz refresh rate feels dated compared to 120Hz competitors`
          );
        } else {
          cons.push(
            `Display quality falls behind competitors with OLED or higher-resolution panels`
          );
        }
        break;
      case 'futureProofing':
        if (device.lifecyclePosition === 'end-of-life') {
          cons.push(
            `End-of-life product — successor expected soon, limiting long-term value`
          );
        } else {
          cons.push(
            `May lack latest connectivity standards for long-term future-proofing`
          );
        }
        break;
    }
  }

  // Additional structural cons
  if (
    !device.storageExpandable &&
    cons.length < 3 &&
    !cons.some((c) => c.toLowerCase().includes('storage'))
  ) {
    cons.push(`No expandable storage — choose your capacity wisely at purchase`);
  }

  if (
    device.formFactor === 'laptop' &&
    device.weight > 2500 &&
    !cons.some((c) => c.toLowerCase().includes('weight') || c.toLowerCase().includes('heav'))
  ) {
    cons.push(
      `Heavy ${(device.weight / 1000).toFixed(2)}kg chassis limits daily portability`
    );
  }

  if (
    device.lifecyclePosition === 'end-of-life' &&
    !cons.some((c) => c.toLowerCase().includes('end-of-life') || c.toLowerCase().includes('successor'))
  ) {
    cons.push(
      `Nearing end-of-life; consider waiting for successor if timing allows`
    );
  }

  return cons.slice(0, 3);
}

/** Generate tags for a recommendation */
function generateTags(
  device: DeviceSpec,
  overallScore: number,
  rank: number,
  scores: Recommendation['scores']
): string[] {
  const tags: string[] = [];

  if (rank === 1) {
    tags.push('Top Pick');
  }

  if (rank <= 3 && scores.valueForMoney >= 80) {
    tags.push('Best Value');
  }

  if (scores.performance >= 85) {
    tags.push('Power User');
  }

  if (scores.portability >= 88) {
    tags.push('Ultra Portable');
  }

  if (scores.battery >= 90) {
    tags.push('All-Day Battery');
  }

  if (scores.displayQuality >= 88) {
    tags.push('Stunning Display');
  }

  if (device.lifecyclePosition === 'just-launched') {
    tags.push('New Release');
  }

  if (overallScore >= 90) {
    tags.push("Editor's Choice");
  }

  if (
    device.repairabilityScore != null &&
    device.repairabilityScore >= 8
  ) {
    tags.push('Repairable');
  }

  return tags;
}

/** Generate lifecycle-aware buying advice for a device */
function buildBuyingAdvice(device: DeviceSpec): string {
  const advice = getLifecycleAdvice(device.lifecyclePosition, device.expectedSuccessorDate);

  if (device.lifecyclePosition === 'end-of-life') {
    const successorPart = device.expectedSuccessorDate
      ? ` Its successor is expected around ${device.expectedSuccessorDate}.`
      : '';
    return `This device is nearing end-of-life.${successorPart} ${advice} Consider waiting unless you find a significant discount.`;
  }

  if (device.lifecyclePosition === 'just-launched') {
    return `Recently launched and at the start of its product cycle. ${advice} Now is a great time to buy for maximum longevity.`;
  }

  if (device.lifecyclePosition === 'upcoming') {
    return `This device hasn't launched yet. ${advice} Pre-ordering is an option, but hands-on reviews may not be available.`;
  }

  // mid-cycle
  const discountPct =
    device.msrp > 0
      ? Math.round(
          ((device.msrp - device.streetPrice) / device.msrp) * 100
        )
      : 0;
  const discountNote =
    discountPct >= 10
      ? ` Currently ${discountPct}% below MSRP — a solid deal.`
      : '';
  return `Mid-cycle product with proven reliability.${discountNote} ${advice} A safe buy with predictable support timeline.`;
}

// ── OS matching helper ───────────────────────────────────────────

function matchesOS(device: DeviceSpec, osPreference: string): boolean {
  if (osPreference === 'no-preference') return true;

  const deviceOS = device.os.toLowerCase();
  const pref = osPreference.toLowerCase();

  switch (pref) {
    case 'ios':
      return deviceOS.includes('ios') || deviceOS.includes('ipados');
    case 'android':
      return deviceOS.includes('android');
    case 'windows':
      return deviceOS.includes('windows');
    case 'macos':
      return deviceOS.includes('macos') || deviceOS.includes('mac os');
    case 'linux':
      return deviceOS.includes('linux');
    case 'chromeos':
      return (
        deviceOS.includes('chromeos') || deviceOS.includes('chrome os')
      );
    default:
      return true;
  }
}

// ── Main Engine ──────────────────────────────────────────────────

export function getRecommendations(input: {
  formFactor: FormFactor;
  useCases: UseCase[];
  budgetMin: number;
  budgetMax: number;
  osPreference: string;
  batteryPriority: BatteryPriority;
  region: string;
  brandPreferences: string[];
}): Recommendation[] {
  const catalog = DEVICE_CATALOG_2026;
  const OVERFLOW_TOLERANCE = 0.15; // 15% over budget for exceptional devices
  const MAX_RESULTS = 5;
  const MIN_RESULTS = 3;

  // ── 1. Filter candidates ──────────────────────────────────────

  let candidates = catalog.filter((device) => {
    // Form factor must match
    if (device.formFactor !== input.formFactor) return false;

    // OS preference
    if (!matchesOS(device, input.osPreference)) return false;

    // Region availability
    if (
      !device.region.includes(input.region as any) &&
      !device.region.includes('global')
    ) {
      return false;
    }

    // Budget range with overflow tolerance
    const maxWithOverflow =
      input.budgetMax * (1 + OVERFLOW_TOLERANCE);
    if (device.streetPrice > maxWithOverflow) return false;
    // Don't filter out devices under budgetMin — they might still be good value
    // but we can apply a small preference for meeting the minimum

    // Brand preferences (if specified, device brand must be in list)
    if (input.brandPreferences.length > 0) {
      const normalizedBrands = input.brandPreferences.map((b) =>
        b.toLowerCase().trim()
      );
      if (
        !normalizedBrands.includes(device.brand.toLowerCase().trim())
      ) {
        return false;
      }
    }

    return true;
  });

  // ── Fallback: expand filters if too few results ────────────────

  let filterExpansionNote = '';

  if (candidates.length < MIN_RESULTS) {
    // Try relaxing brand preferences
    const withoutBrand = catalog.filter((device) => {
      if (device.formFactor !== input.formFactor) return false;
      if (!matchesOS(device, input.osPreference)) return false;
      if (
        !device.region.includes(input.region as any) &&
        !device.region.includes('global')
      )
        return false;
      const maxWithOverflow =
        input.budgetMax * (1 + OVERFLOW_TOLERANCE);
      if (device.streetPrice > maxWithOverflow) return false;
      return true;
    });

    if (withoutBrand.length >= MIN_RESULTS) {
      candidates = withoutBrand;
      filterExpansionNote =
        'Brand filter was expanded to show more results.';
    } else {
      // Relax OS preference too
      const withoutOS = catalog.filter((device) => {
        if (device.formFactor !== input.formFactor) return false;
        if (
          !device.region.includes(input.region as any) &&
          !device.region.includes('global')
        )
          return false;
        const maxWithOverflow =
          input.budgetMax * (1 + OVERFLOW_TOLERANCE);
        if (device.streetPrice > maxWithOverflow) return false;
        return true;
      });

      if (withoutOS.length >= MIN_RESULTS) {
        candidates = withoutOS;
        filterExpansionNote =
          'Brand and OS filters were expanded to show more results.';
      } else {
        // Relax budget by an additional 30%
        const relaxedBudget = catalog.filter((device) => {
          if (device.formFactor !== input.formFactor) return false;
          if (
            !device.region.includes(input.region as any) &&
            !device.region.includes('global')
          )
            return false;
          if (device.streetPrice > input.budgetMax * 1.45) return false;
          return true;
        });

        candidates = relaxedBudget;
        filterExpansionNote =
          'Filters including budget, brand, and OS were expanded to show more results. Some devices may exceed your original budget.';
      }
    }
  }

  // If still zero candidates, return empty
  if (candidates.length === 0) {
    return [];
  }

  // ── 2. Score each candidate ────────────────────────────────────

  const weights = mergeWeights(input.useCases);

  const scored = candidates.map((device) => {
    const scores: Recommendation['scores'] = {
      performance: scorePerformance(device, input.useCases),
      battery: scoreBattery(device, input.batteryPriority),
      portability: scorePortability(device),
      valueForMoney: scoreValue(device, input.budgetMax),
      displayQuality: scoreDisplay(device),
      futureProofing: scoreFutureProofing(device),
    };

    const overallScore = Math.round(
      scores.performance * weights.performance +
        scores.battery * weights.battery +
        scores.portability * weights.portability +
        scores.valueForMoney * weights.valueForMoney +
        scores.displayQuality * weights.displayQuality +
        scores.futureProofing * weights.futureProofing
    );

    return { device, scores, overallScore };
  });

  // ── 3. Sort and rank ───────────────────────────────────────────

  scored.sort((a, b) => b.overallScore - a.overallScore);

  const topCandidates = scored.slice(0, MAX_RESULTS);

  // ── 4. Build recommendations ──────────────────────────────────

  // Find the device with the best value score for "Best Value" tagging
  let bestValueIdx = 0;
  let bestValueScore = 0;
  topCandidates.forEach((c, i) => {
    if (c.scores.valueForMoney > bestValueScore) {
      bestValueScore = c.scores.valueForMoney;
      bestValueIdx = i;
    }
  });

  const recommendations: Recommendation[] = topCandidates.map(
    ({ device, scores, overallScore }, index) => {
      const rank = index + 1;

      const pros = generatePros(device, scores);
      const cons = generateCons(device, scores);

      let buyingAdvice = buildBuyingAdvice(device);
      if (filterExpansionNote && index === 0) {
        buyingAdvice = `Note: ${filterExpansionNote} ${buyingAdvice}`;
      }

      const tags = generateTags(device, overallScore, rank, scores);

      // If this is the best-value device and it isn't rank 1, ensure the tag
      if (
        index === bestValueIdx &&
        !tags.includes('Best Value') &&
        scores.valueForMoney >= 65
      ) {
        tags.push('Best Value');
      }

      // Find a lower-cost alternative (the next ranked device that costs less)
      let alternativeId: string | undefined;
      for (let i = index + 1; i < scored.length; i++) {
        if (scored[i].device.streetPrice < device.streetPrice) {
          alternativeId = scored[i].device.id;
          break;
        }
      }

      return {
        device,
        overallScore,
        scores,
        pros,
        cons,
        buyingAdvice,
        alternativeId,
        tags,
      };
    }
  );

  return recommendations;
}
