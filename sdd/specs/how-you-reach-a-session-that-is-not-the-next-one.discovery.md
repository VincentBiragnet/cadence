# Discovery: How you reach a session that is not the next one

**Discovery for:** one-session-on-screen-the-rest-a-step-away (OQ-1)
**Question:** How do you reach a session that is not the one offered, and how do you get back?

_Edit via `scripts/spec.py`, never by hand._

## Open Questions
_No items yet._

## State of the Art
- **SOTA-1** Reproduced in the real app at 390x844 with the HSR programme: the first session row sits at y=1126 and the Start control at y=1642 on an 844-tall screen, because the programme's standing rules render above the list. Opening the app shows a rulebook and no sessions. That is a regression I introduced with the guidance work, and it is a large part of what bloated is describing
- **SOTA-2** Checked and rejected: two reviewers reported the list wrapping into two columns whose reading order is not days. In the real app all 172 rows of the AM/PM programme render single column at left 29. It reproduces only in my prototype page, whose container differs. The stray duplicate .cdp-list rule they found is real dead CSS from the dropdown era, but it is not what they saw
- **SOTA-3** Checked, and it is working as specified rather than broken: the marker a reviewer read as TODAY on a row dated four days ahead is KD-31 of the archived program-view spec, which puts it before the first row not behind today. The behaviour is right and the affordance is wrong, since it reads as this row is today
- **SOTA-4** Confirmed: starting takes two presses everywhere, the card's Start and then the sequence's own. The second is the archived sequence-clock KD-5, a deliberate gesture for a standalone multi-minute run, but inside a programme the first press is already that gesture
- **SOTA-5** Observed by the habitual user, who does this forty times out of forty-one: the card itself is right, nothing to read and nothing to decide, and then the word Start appears twice on two screens in two styles before anything runs
- **SOTA-6** Observed by the habitual user: in A and C, checking whether a session is done costs you your place, because choosing moves the card and no treatment has a way back to today. Only B leaves the card where it was
- **SOTA-7** Observed by the habitual user: A cannot answer did I do Wednesday's, because the dropdown carries labels only and no day or date appears in it anywhere
- **SOTA-8** Observed by the habitual user: NEXT UP and CHOSEN render identically, same size, same grey, same slot, same Start, so a card showing a session you browsed to looks exactly like the one you should do. What actually protects them is the label carrying 3x15 against 4x6
- **SOTA-9** Observed by the AM/PM user at 172 sessions: A needs 110 arrow presses to reach week 9 and C needs 110 taps out and 110 back, while B costs 7.8 pane-heights of scrolling. C's arrows are a fine gesture for yesterday and tomorrow and useless across 172
- **SOTA-10** Observed by the AM/PM user: no card in any treatment answers did I do this morning. With the evening session done but the morning one not, the card offers the morning session at 7pm with nothing marking it out of phase; with both done it offers tomorrow morning under NEXT UP rather than saying the day is finished
- **SOTA-11** Observed by the AM/PM user: what a session actually is lives in sequence.title, Wk1 Fri AM ROM and activation against PM strengthening, and never appears on the card or the row because label wins. You learn what you are doing only after pressing Start
- **SOTA-12** Proposed by the AM/PM user: a day card rather than a session card, showing both of today's slots and their state, because their question is what does today still owe me rather than which session is next. And a switcher shaped like the programme, twelve weeks of days, rather than one flat queue of 172
- **SOTA-13** Reproduced in the real app, not the prototype: selecting a milestone dated 2026-12-25 and pressing the button labelled Start recorded actualDate 2026-09-10 immediately, with no confirmation dialog and no undo. A milestone is what the whole schedule anchors to, so this is the most damaging single tap in the app and nothing about it says so
- **SOTA-14** Reproduced: the overrun warning cannot fire for the person who needs it. _overrun compares the planned dates of unrun sessions to the milestone, and planned dates only slide when something is completed, so someone who has stopped moving never trips it. The reviewer five weeks adrift saw a calm grey line reading 5 of 37 done, finishes 2026-12-04
- **SOTA-15** Observed by the adrift user: A renders dropped and done identically, both as a tick, so the two sessions they abandoned during a flare-up read as completed. A's dropdown is its only history surface and it misreports their own injury history
- **SOTA-16** Observed by the adrift user: A has no route to the list at all, so in A the number of sessions behind is not one tap away, it is unreachable; and picking week 9 from the dropdown and pressing Start put a detrained tendon two taps from a six-rep-max session with no confirmation anywhere
- **SOTA-17** Observed by the adrift user: the suggestion is the earliest unrun session by planned date and never looks at what was last actually done, so after a lay-off and an out-of-order 4x10 it still offers a 3x12 from week 2 and calls it NEXT UP. Being sent backwards is the safe direction, but it is offered as though the plan were intact
- **SOTA-18** All three reviewers reached the same verdict on the dropdown and the arrows: A is rejected by every one of them, C is rejected at 172 entries and adds only a position counter nobody wanted, and B is the only defensible shape while still not being good enough. The agreement is unusual and it is about what the card must carry, not about which switcher wins

## Proposed Decisions
- **PD-1** The shape is B: one card, with the full dated list one deliberate press away and a press back. The dropdown is refused outright, since it carries no dates, renders dropped as done and hides how far behind you are; the arrows are refused as a way to cross a programme, though stepping to the adjacent session stays reasonable
- **PD-2** The card carries orientation, not just a title: how many sessions are behind, the next fixed date and how long until it, and whether the plan still fits before it. Every reviewer counted those by hand off the list, which is the work the card exists to save
- **PD-3** A card showing anything other than the session you are due must say so unmistakably and offer a way back to today. NEXT UP and CHOSEN currently render identically, and no treatment has a way home
- **PD-4** The card names what pressing the button will do, the way the list bar already does, because a browsed session and the due one are otherwise one identical tap apart
- **PD-5** A milestone is never started. It is marked reached, behind a confirmation naming its date, because it is the anchor the whole schedule hangs on

## Proposed Criteria
- **PC-1** Selecting a milestone offers to mark it reached rather than start it, and recording it requires a confirmation that names its date; declining records nothing
- **PC-2** With sessions overdue and a milestone ahead, the card states the number behind and the days remaining, and says plainly when what is still due cannot fit before the milestone at the programme's own stated rate
- **PC-3** A card showing a session other than the due one is visibly marked as such and carries a control that returns to the due one in one press
- **PC-4** Opening the full list scrolls to the current session rather than to the top, on a 37-entry programme and on a 172-entry one

## Changelog
- 2026-09-10: Opened for OQ-1 of one-session-on-screen-the-rest-a-step-away.
- 2026-09-10: SOTA-1 added
- 2026-09-10: SOTA-2 added
- 2026-09-10: SOTA-3 added
- 2026-09-10: SOTA-4 added
- 2026-09-10: SOTA-5 added
- 2026-09-10: SOTA-6 added
- 2026-09-10: SOTA-7 added
- 2026-09-10: SOTA-8 added
- 2026-09-10: SOTA-9 added
- 2026-09-10: SOTA-10 added
- 2026-09-10: SOTA-11 added
- 2026-09-10: SOTA-12 added
- 2026-09-10: SOTA-13 added
- 2026-09-10: SOTA-14 added
- 2026-09-10: SOTA-15 added
- 2026-09-10: SOTA-16 added
- 2026-09-10: SOTA-17 added
- 2026-09-10: SOTA-18 added
- 2026-09-10: PD-1 added
- 2026-09-10: PD-2 added
- 2026-09-10: PD-3 added
- 2026-09-10: PD-4 added
- 2026-09-10: PD-5 added
- 2026-09-10: PC-1 added
- 2026-09-10: PC-2 added
- 2026-09-10: PC-3 added
- 2026-09-10: PC-4 added
