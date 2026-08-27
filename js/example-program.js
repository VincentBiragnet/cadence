// The worked example: eight weeks of bodyweight strength, three sessions a
// week (Monday, Wednesday, Friday), built as plain data at load time.
//
// A classic script assigning a global (KD-10) rather than a .json file:
// fetching JSON is blocked by CORS under file://, and the page has to work
// double-clicked as well as served.
//
// NG-2: the format has no notion of progression, so every entry carries its
// own complete sequence config. This builder is where the progression
// actually lives — it is authoring convenience, not a feature of the shape,
// and the JSON it produces is exactly what a person could have typed out.

(function () {
  const DAYS = [1, 3, 5]; // Monday, Wednesday, Friday (KD-2)

  const SESSIONS = [
    { name: 'Push', moves: ['Push-up', 'Pike push-up', 'Dip'] },
    { name: 'Legs', moves: ['Squat', 'Lunge', 'Calf raise'] },
    { name: 'Core', moves: ['Plank', 'Leg raise', 'Crunch'] },
  ];

  // Week 1 works 20s and rests 25s over 2 rounds; week 8 works 40s and
  // rests 15s over 4. Everything in between is a straight interpolation.
  function shape(week) {
    return {
      work: 20 + Math.round((week - 1) * (20 / 7)),
      rest: 25 - Math.round((week - 1) * (10 / 7)),
      rounds: 2 + Math.floor((week - 1) / 3),
    };
  }

  const entries = [];
  for (let week = 1; week <= 8; week += 1) {
    const { work, rest, rounds } = shape(week);
    SESSIONS.forEach((session, i) => {
      const steps = [];
      session.moves.forEach((move, m) => {
        steps.push({ label: move, durationSeconds: work, startFrequency: 440, endFrequency: 880 });
        if (m < session.moves.length - 1) {
          steps.push({ label: 'Rest', durationSeconds: rest });
        }
      });
      entries.push({
        week,
        day: DAYS[i],
        sequence: {
          title: `Week ${week} — ${session.name}`,
          blocks: [
            { repetitions: 1, steps: [{ label: 'Warm-up', durationSeconds: 60, endFrequency: 660 }] },
            { repetitions: rounds, steps },
            { repetitions: 1, steps: [{ label: 'Cool-down', durationSeconds: 60, startFrequency: 660 }] },
          ],
        },
      });
    });
  }

  window.CADENCE_EIGHT_WEEK = {
    title: 'Eight-week bodyweight strength',
    entries,
  };
})();
