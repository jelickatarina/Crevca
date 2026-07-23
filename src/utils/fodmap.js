import { addDays, daysBetween, parseISO } from './date.js';
import { FODMAP_GROUPS } from '../data/foods.js';

export const ELIMINATION_DAYS = 42;
export const TEST_DAYS = 3;
export const PAUSE_DAYS = 3;

export const TEST_DAY_SUGGESTIONS = [
  // Fruktani
  ['1/2 kriške pšeničnog hleba', '1 cela kriška pšeničnog hleba', '2 kriške pšeničnog hleba'],
  // Laktoza
  ['1/2 šolje kravljeg mleka', '3/4 šolje kravljeg mleka', '1 puna šolja kravljeg mleka'],
  // Fruktoza
  ['2 kašičice meda', '1 kašika meda', '2 kašike meda'],
  // GOS
  ['1/4 šolje kuvanog sočiva', '1/2 šolje kuvanog sočiva', '3/4 šolje kuvanog sočiva'],
  // Sorbitol
  ['2 kajsije', '4 kajsije', '6 kajsija'],
  // Manitol
  ['1/4 šolje kuvanog karfiola', '1/2 šolje kuvanog karfiola', '3/4 šolje kuvanog karfiola'],
];

export function computeSchedule(startIso) {
  const eliminationStart = startIso;
  const eliminationEnd = addDays(startIso, ELIMINATION_DAYS - 1);
  let cursor = addDays(eliminationEnd, 1);
  const groups = FODMAP_GROUPS.map((g, index) => {
    const testStart = cursor;
    const testEnd = addDays(testStart, TEST_DAYS - 1);
    const pauseStart = addDays(testEnd, 1);
    const pauseEnd = addDays(pauseStart, PAUSE_DAYS - 1);
    cursor = addDays(pauseEnd, 1);
    return { index, name: g.name, primer: g.primer, testStart, testEnd, pauseStart, pauseEnd };
  });
  const reintroStart = groups[0].testStart;
  const reintroEnd = groups[groups.length - 1].testEnd;
  return { eliminationStart, eliminationEnd, reintroStart, reintroEnd, groups };
}

export function getPhase(schedule, todayIso) {
  if (todayIso < schedule.eliminationStart) {
    return { phase: 'pre' };
  }
  if (todayIso <= schedule.eliminationEnd) {
    return {
      phase: 'elimination',
      dayNum: daysBetween(schedule.eliminationStart, todayIso) + 1,
      totalDays: ELIMINATION_DAYS,
    };
  }
  for (const group of schedule.groups) {
    if (todayIso >= group.testStart && todayIso <= group.testEnd) {
      return { phase: 'testing', group, dayNum: daysBetween(group.testStart, todayIso) + 1 };
    }
    if (todayIso >= group.pauseStart && todayIso <= group.pauseEnd) {
      return { phase: 'pause', group, dayNum: daysBetween(group.pauseStart, todayIso) + 1 };
    }
  }
  return { phase: 'done' };
}

export function totalReintroDay(schedule, todayIso) {
  if (todayIso < schedule.reintroStart) return 0;
  return daysBetween(schedule.reintroStart, todayIso) + 1;
}

export function totalReintroDays(schedule) {
  return daysBetween(schedule.reintroStart, schedule.reintroEnd) + 1;
}

export function testSuggestion(groupIndex, dayNum) {
  const arr = TEST_DAY_SUGGESTIONS[groupIndex] || [];
  return arr[Math.min(Math.max(dayNum - 1, 0), arr.length - 1)] || '';
}

/**
 * verdictsByGroup: { [groupIndex]: { verdict: 'podnosi'|'delimicno'|'ne_podnosi', beleska } }
 */
export function foodStatus(food, schedule, verdictsByGroup, todayIso) {
  if (food.fodmap_grupa === 'uvek_nisko') {
    return { key: 'ok', label: 'dozvoljeno' };
  }
  if (food.portion_safe) {
    return { key: 'warn', label: 'malo, oprezno' };
  }
  const verdict = verdictsByGroup[food.fodmap_grupa];
  if (verdict) {
    if (verdict.verdict === 'podnosi') return { key: 'ok', label: 'dozvoljeno' };
    return { key: 'no', label: 'izbegavaj (potvrđeno)' };
  }
  const phase = getPhase(schedule, todayIso);
  if (phase.phase === 'testing' && phase.group.index === food.fodmap_grupa) {
    return { key: 'warn', label: 'u testiranju' };
  }
  return { key: 'no', label: 'izbegavaj' };
}
