// Shared programs for the program-view tests. Not a *.spec.js, so Playwright
// does not collect it as a suite.
export const blocks = [{ repetitions: 1, steps: [{ label: 'x', durationSeconds: 0.2 }] }];

// The guitar case: long authored titles, a short label for the list.
export function longTitled(count = 60) {
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const week = Math.floor(i / 6) + 1;
    entries.push({
      week, day: (i % 6) + 1,
      label: `Scales ${84 + week}`,
      sequence: {
        title: 'chromatic warm-up, scales at rising tempo, arpeggio patterns, repertoire study, sight-reading',
        blocks,
      },
    });
  }
  return { title: 'Long titles', entries };
}

export const dated = {
  title: 'Dated',
  entries: [
    { week: 1, day: 1, label: 'First', sequence: { title: 'A', blocks } },
    { week: 2, day: 1, label: 'Second', sequence: { title: 'B', blocks } },
    { week: 3, day: 1, label: 'Third', sequence: { title: 'C', blocks } },
    { week: 4, day: 7, milestone: true, date: '2026-09-27', title: 'Race' },
  ],
};
