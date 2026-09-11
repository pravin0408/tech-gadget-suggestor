/**
 * Dynamic Temporal Anchoring Module
 * Ensures all recommendations are grounded to Sep 2026 market conditions.
 */

import type { LifecyclePosition } from '../types/index';

/** Returns the current runtime ISO timestamp for anchoring */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/** Returns the current year (should always be 2026 in production) */
export function getRuntimeYear(): number {
  return new Date().getFullYear();
}

/** Generates a unique request ID for tracing */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Determines if a device is within an acceptable recency window.
 * Devices released more than 18 months ago are flagged.
 */
export function isDeviceCurrent(releaseDate: string): boolean {
  const release = new Date(releaseDate);
  const now = new Date();
  const monthsDiff =
    (now.getFullYear() - release.getFullYear()) * 12 +
    (now.getMonth() - release.getMonth());
  return monthsDiff <= 18;
}

/**
 * Returns lifecycle buying advice based on device position and expected successor.
 */
export function getLifecycleAdvice(
  lifecyclePosition: LifecyclePosition,
  expectedSuccessorDate?: string
): string {
  const months = monthsUntilSuccessor(expectedSuccessorDate);
  const successorContext =
    months !== null && months > 0
      ? ` The successor is expected in approximately ${months} month${months === 1 ? '' : 's'}.`
      : months !== null && months <= 0
        ? ' The successor is expected imminently or has already launched.'
        : '';

  switch (lifecyclePosition) {
    case 'just-launched':
      return (
        'Great time to buy — this device just launched and you will enjoy the longest support window and latest hardware.' +
        successorContext
      );

    case 'mid-cycle':
      if (months !== null && months <= 3) {
        return (
          'This device is mid-cycle and a successor is around the corner. Consider waiting for the next generation, ' +
          'or negotiate a discount on the current model.' +
          successorContext
        );
      }
      return (
        'Solid purchase — this device is in the middle of its lifecycle. You can likely negotiate a small discount ' +
        'from MSRP, and it still has plenty of software support ahead.' +
        successorContext
      );

    case 'end-of-life':
      if (months !== null && months <= 2) {
        return (
          'This device is at end-of-life and its replacement is imminent. Wait for the successor unless you find a ' +
          'steep discount (30%+ off MSRP).' +
          successorContext
        );
      }
      return (
        'This device is at end-of-life. Only buy if you find a significant discount (25%+ off) and are comfortable ' +
        'with a shorter remaining support window.' +
        successorContext
      );

    case 'upcoming':
      return (
        'This device has not been released yet. Wait for the official launch and early reviews before committing.' +
        successorContext
      );

    default: {
      const _exhaustive: never = lifecyclePosition;
      return `Unknown lifecycle position: ${_exhaustive}. Proceed with caution.`;
    }
  }
}

/**
 * Computes months until expected successor launch.
 * Returns a positive number if the successor is in the future,
 * zero or negative if the date has passed, and null if no date is provided.
 */
export function monthsUntilSuccessor(expectedDate?: string): number | null {
  if (!expectedDate) return null;
  const target = new Date(expectedDate);
  const now = new Date();
  return (
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth())
  );
}
