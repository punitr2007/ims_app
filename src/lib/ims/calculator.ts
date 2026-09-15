import { AttendanceSubject } from './types';

/**
 * Calculates bunking allowance and required recovery lectures.
 * Target default is 75%.
 */
export function calculateSubjectBunks(
  attended: number,
  totalHeld: number,
  targetPercentage: number = 75
): {
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
  bunkableClasses: number;
  requiredClasses: number;
} {
  if (totalHeld === 0) {
    return {
      percentage: 100,
      status: 'safe',
      bunkableClasses: 0,
      requiredClasses: 0,
    };
  }

  const percentage = Math.round((attended / totalHeld) * 1000) / 10;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (percentage < 70) {
    status = 'danger';
  } else if (percentage < 75) {
    status = 'warning';
  }

  // Bunk calculation:
  // (attended / (totalHeld + bunks)) >= target/100
  // attended >= (target/100) * totalHeld + (target/100) * bunks
  // bunks <= (attended - (target/100) * totalHeld) / (target/100)
  // bunks <= (100 * attended / target) - totalHeld
  let bunkableClasses = 0;
  if (percentage >= targetPercentage) {
    bunkableClasses = Math.floor((100 * attended) / targetPercentage - totalHeld);
    if (bunkableClasses < 0) bunkableClasses = 0;
  }

  // Recovery calculation:
  // ((attended + req) / (totalHeld + req)) >= target/100
  // 100 * attended + 100 * req >= target * totalHeld + target * req
  // req * (100 - target) >= target * totalHeld - 100 * attended
  // req >= (target * totalHeld - 100 * attended) / (100 - target)
  let requiredClasses = 0;
  if (percentage < targetPercentage) {
    const numerator = targetPercentage * totalHeld - 100 * attended;
    const denominator = 100 - targetPercentage;
    requiredClasses = Math.ceil(numerator / denominator);
    if (requiredClasses < 0) requiredClasses = 0;
  }

  return {
    percentage,
    status,
    bunkableClasses,
    requiredClasses,
  };
}

export function computeOverallAttendance(subjects: AttendanceSubject[]) {
  let totalHeld = 0;
  let totalAttended = 0;

  for (const sub of subjects) {
    totalHeld += sub.totalHeld;
    totalAttended += sub.attended;
  }

  const overallPercentage = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 1000) / 10 : 100;
  const { bunkableClasses, requiredClasses, status } = calculateSubjectBunks(totalAttended, totalHeld, 75);

  return {
    totalHeld,
    totalAttended,
    overallPercentage,
    status,
    bunkableClasses,
    requiredClasses,
  };
}
