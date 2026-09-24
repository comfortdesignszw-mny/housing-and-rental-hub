import { RoommateProfile } from '../types';

export interface CompatibilityResult {
  score: number; // 0 - 100%
  grade: 'Exceptional' | 'High' | 'Good' | 'Fair';
  matchFactors: string[];
  mismatchFactors: string[];
}

export function calculateRoommateCompatibility(
  myProfile: Partial<RoommateProfile>,
  candidate: RoommateProfile
): CompatibilityResult {
  let score = 50; // baseline
  const matchFactors: string[] = [];
  const mismatchFactors: string[] = [];

  // 1. Budget Compatibility (Weight: 25 points)
  if (myProfile.budgetUsd && candidate.budgetUsd) {
    const budgetDiff = Math.abs(myProfile.budgetUsd - candidate.budgetUsd);
    const avgBudget = (myProfile.budgetUsd + candidate.budgetUsd) / 2;
    const pctDiff = budgetDiff / (avgBudget || 1);

    if (pctDiff <= 0.15) {
      score += 25;
      matchFactors.push(`Near-identical budget ($${candidate.budgetUsd}/mo vs your $${myProfile.budgetUsd}/mo)`);
    } else if (pctDiff <= 0.35) {
      score += 15;
      matchFactors.push(`Compatible rental budget ($${candidate.budgetUsd}/mo)`);
    } else if (pctDiff <= 0.6) {
      score += 5;
    } else {
      score -= 15;
      mismatchFactors.push(`Budget difference ($${candidate.budgetUsd}/mo vs your $${myProfile.budgetUsd}/mo)`);
    }
  }

  // 2. Location Compatibility (Weight: 20 points)
  if (myProfile.preferredCities?.length) {
    const commonCities = candidate.preferredCities.filter(c =>
      myProfile.preferredCities!.some(myC => myC.toLowerCase() === c.toLowerCase())
    );
    if (commonCities.length > 0) {
      score += 15;
      matchFactors.push(`Looking in ${commonCities.join(', ')}`);

      // Suburb overlap bonus
      if (myProfile.preferredSuburbs?.length && candidate.preferredSuburbs?.length) {
        const commonSuburbs = candidate.preferredSuburbs.filter(s =>
          myProfile.preferredSuburbs!.some(myS => myS.toLowerCase() === s.toLowerCase())
        );
        if (commonSuburbs.length > 0) {
          score += 8;
          matchFactors.push(`Same target suburb: ${commonSuburbs.join(', ')}`);
        }
      }
    } else {
      score -= 10;
      mismatchFactors.push(`Different target cities (${candidate.preferredCities.join(', ')})`);
    }
  }

  // 3. Student / Work Status (Weight: 15 points)
  if (myProfile.studentStatus && candidate.studentStatus) {
    if (myProfile.studentStatus === candidate.studentStatus) {
      score += 12;
      matchFactors.push(`Both are ${candidate.studentStatus === 'Student' ? 'students' : 'working professionals'}`);
    } else {
      score += 5;
    }
  }

  // 4. Cleanliness (Weight: 15 points)
  if (myProfile.cleanliness && candidate.cleanliness) {
    if (myProfile.cleanliness === candidate.cleanliness) {
      score += 12;
      matchFactors.push(`Matching cleaning style (${candidate.cleanliness})`);
    } else if (
      (myProfile.cleanliness === 'Very Clean' && candidate.cleanliness === 'Relaxed') ||
      (myProfile.cleanliness === 'Relaxed' && candidate.cleanliness === 'Very Clean')
    ) {
      score -= 10;
      mismatchFactors.push(`Cleanliness clash (${myProfile.cleanliness} vs ${candidate.cleanliness})`);
    } else {
      score += 4;
    }
  }

  // 5. Sleep Schedule (Weight: 10 points)
  if (myProfile.sleepSchedule && candidate.sleepSchedule) {
    if (myProfile.sleepSchedule === candidate.sleepSchedule) {
      score += 10;
      matchFactors.push(`Synchronized routine (${candidate.sleepSchedule})`);
    } else if (myProfile.sleepSchedule === 'Flexible' || candidate.sleepSchedule === 'Flexible') {
      score += 5;
    } else {
      score -= 5;
      mismatchFactors.push(`Opposite sleep hours (${myProfile.sleepSchedule} vs ${candidate.sleepSchedule})`);
    }
  }

  // 6. Smoking & Drinking Preferences (Weight: 15 points)
  if (myProfile.smokingPreference && candidate.smokingPreference) {
    if (myProfile.smokingPreference === 'Non-Smoker' && candidate.smokingPreference === 'Smoker') {
      score -= 20;
      mismatchFactors.push('Smoking preference mismatch (Non-smoker vs Smoker)');
    } else if (myProfile.smokingPreference === candidate.smokingPreference) {
      score += 8;
      matchFactors.push(`Same smoking preference (${candidate.smokingPreference})`);
    }
  }

  // Clamp score between 15 and 99
  const finalScore = Math.max(15, Math.min(99, score));

  let grade: CompatibilityResult['grade'] = 'Fair';
  if (finalScore >= 85) grade = 'Exceptional';
  else if (finalScore >= 75) grade = 'High';
  else if (finalScore >= 60) grade = 'Good';

  return {
    score: finalScore,
    grade,
    matchFactors,
    mismatchFactors,
  };
}
