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

  // KD-19: the shipped example carries guidance too. An example without it
  // teaches that guidance is optional decoration, and Try is what most
  // people press before they ever read the contract.
  const CUES = {
    'Push-up': 'Ribs down, elbows back — stop before the hips sag.',
    'Pike push-up': 'Hips high, crown of the head towards the floor.',
    Dip: 'Shoulders down away from the ears the whole way.',
    Squat: 'Knees track over the toes, heels stay down.',
    Lunge: 'Front shin upright, back knee towards the floor.',
    'Calf raise': 'All the way up, all the way down, no bouncing.',
    Plank: 'One line from ear to heel — squeeze the glutes.',
    'Leg raise': 'Lower back stays flat on the floor.',
    Crunch: 'Chin off the chest, lift with the ribs not the neck.',
  };

  const SESSIONS = [
    { name: 'Push', moves: ['Push-up', 'Pike push-up', 'Dip'],
      guidance: [
        { heading: 'This block', text: 'Work the whole round, then rest once at the end.' },
        { heading: 'Watch for', items: ['Hips sagging', 'Elbows flaring wide'] },
      ] },
    { name: 'Legs', moves: ['Squat', 'Lunge', 'Calf raise'],
      guidance: [
        { heading: 'This block', text: 'Slow down rather than shorten the range.' },
        { heading: 'Watch for', items: ['Heels lifting', 'Knees falling inwards'] },
      ] },
    { name: 'Core', moves: ['Plank', 'Leg raise', 'Crunch'],
      guidance: [
        { heading: 'This block', text: 'Breathe normally throughout — do not hold your breath.' },
        { heading: 'Watch for', items: ['Lower back arching off the floor', 'Pulling on the neck'] },
      ] },
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
        steps.push({ label: move, durationSeconds: work, cue: CUES[move],
                     startFrequency: 440, endFrequency: 880 });
        if (m < session.moves.length - 1) {
          steps.push({ label: 'Rest', durationSeconds: rest });
        }
      });
      entries.push({
        week,
        day: DAYS[i],
        guidance: [
          { heading: 'This session',
            text: `${rounds} rounds of ${session.moves.length} moves, `
                  + `${work}s on and ${rest}s between.` },
        ],
        sequence: {
          title: `Week ${week} — ${session.name}`,
          blocks: [
            { repetitions: 1, steps: [{ label: 'Warm-up', durationSeconds: 60, endFrequency: 660 }] },
            { repetitions: rounds, guidance: session.guidance, steps },
            { repetitions: 1, steps: [{ label: 'Cool-down', durationSeconds: 60, startFrequency: 660 }] },
          ],
        },
      });
    });
  }

  window.CADENCE_EIGHT_WEEK = {
    title: 'Eight-week bodyweight strength',
    guidance: [
      { heading: 'Before you start',
        items: ['Three sessions a week, never two days running.',
                'Warm up first — the built-in minute is the minimum, not the target.',
                'Stop and get it looked at if a joint hurts, rather than a muscle.'] },
    ],
    entries,
  };
})();
