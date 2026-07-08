import type { CalendarEvent } from "./types";

/** Seed events omit `updatedAt` (it's stamped at load time by useEvents via
 *  `withStamp`), so they're typed as CalendarEvent minus that field. */
export type SeedEvent = Omit<CalendarEvent, "updatedAt">;

/**
 * Initial events. Mirrors the planning data from the LaTeX calendar so a fresh
 * install isn't an empty grid. Users can add/remove freely; their changes
 * persist to localStorage and override these defaults.
 */
export const SEED_EVENTS: SeedEvent[] = [
  // ---- May 2026 ----
  { id: "seed-001", date: "2026-05-08", category: "MILESTONE", title: "Calendar starts (today)", description: "Master calendar starting point.", completed: false },
  { id: "seed-002", date: "2026-05-18", category: "REMINDER",  title: "Confirm summer plans", description: "Lock down housing, start dates, paperwork for whatever Summer 2026 placement you landed.", completed: false },
  { id: "seed-003", date: "2026-05-25", category: "REMINDER",  title: "Pre-summer reading", description: "Skim 2-3 papers from your summer mentor's group before the program starts.", completed: false },

  // ---- June 2026 ----
  { id: "seed-004", date: "2026-06-06", category: "ACADEMIC",  title: "Spring qtr ends", description: "UChicago Spring 2026 quarter ends (verify exact date).", completed: false },
  { id: "seed-005", date: "2026-06-15", category: "RESEARCH",  title: "Summer research begins", description: "Most summer programs begin mid-June (Metcalf, SURF, SULI). Confirm with placement.", completed: false },
  { id: "seed-006", date: "2026-06-30", category: "REMINDER",  title: "Mid-summer check", description: "Have a defined project, lit-review notes, and a plan. If not, sync with your mentor.", completed: false },

  // ---- July 2026 ----
  { id: "seed-007", date: "2026-07-01", category: "FELLOWSHIP", title: "Track Hertz & K-H", description: "Begin researching Hertz / Knight-Hennessy timelines.", completed: false },
  { id: "seed-008", date: "2026-07-15", category: "REMINDER",  title: "Draft summer poster", description: "Most summer programs require a final poster/report. Start a draft mid-summer.", completed: false },

  // ---- August 2026 ----
  { id: "seed-009", date: "2026-08-01", category: "REMINDER",  title: "Update CV", description: "Add summer research, techniques, results. Use UChicago CCRF CV Guide.", completed: false },
  { id: "seed-010", date: "2026-08-15", category: "REMINDER",  title: "Line up recommenders", description: "Identify 2-3 LoR writers for Summer 2027 cycle. Notify them now.", completed: false },
  { id: "seed-011", date: "2026-08-31", category: "REMINDER",  title: "Draft 'why this lab'", description: "Reusable templates for SURFs / Argonne / Amgen / Coastar.", completed: false },

  // ---- September 2026 ----
  { id: "seed-012", date: "2026-09-21", category: "ACADEMIC",  title: "Autumn qtr begins", description: "Year 3 starts: PHYS 27900, PHYS 21101, PHYS 24310, MATH 25400.", completed: false },
  { id: "seed-013", date: "2026-09-28", category: "FELLOWSHIP", title: "Hertz cycle opens", description: "Reference: Hertz Fellowship typically opens late Sept (for graduating seniors).", completed: false },

  // ---- October 2026 ----
  { id: "seed-014", date: "2026-10-01", category: "OPENS",     title: "Tracker spreadsheet", description: "Many summer programs open in October. Start a tracker.", completed: false },
  { id: "seed-015", date: "2026-10-15", category: "OPENS",     title: "SULI opens", description: "DOE SULI Summer 2027 application opens (approx). Begin personal statement.", completed: false },
  { id: "seed-016", date: "2026-10-26", category: "FELLOWSHIP", title: "Hertz deadline", description: "Hertz Fellowship deadline (approx) — reference for the class above you.", completed: false },

  // ---- November 2026 ----
  { id: "seed-017", date: "2026-11-01", category: "OPENS",     title: "Amgen opens", description: "Amgen Scholars Summer 2027 applications open (CONFIRMED). Deadline Feb 1, 2027.", completed: false },
  { id: "seed-018", date: "2026-11-09", category: "OPENS",     title: "Caltech SURF opens", description: "Caltech SURF Summer 2027 opens (approx). Identify a Caltech mentor EARLY.", completed: false },
  { id: "seed-019", date: "2026-11-16", category: "OPENS",     title: "NIST + Argonne open", description: "NIST SURF & Argonne / Metcalf Summer 2027 applications open (approx).", completed: false },
  { id: "seed-020", date: "2026-11-23", category: "REMINDER",  title: "Reg: Winter '27", description: "Course registration: CHEM 36400, PHYS 21102, PHYS 22500, MATH 25500.", completed: false },

  // ---- December 2026 ----
  { id: "seed-021", date: "2026-12-07", category: "ACADEMIC",  title: "Autumn qtr ends", description: "UChicago Autumn 2026 ends (verify). Reading period + finals.", completed: false },
  { id: "seed-022", date: "2026-12-15", category: "REMINDER",  title: "Finalize summer apps", description: "Use winter break to FINISH summer 2027 essays.", completed: false },

  // ---- January 2027 ----
  { id: "seed-023", date: "2027-01-04", category: "ACADEMIC",  title: "Winter qtr begins", description: "Per plan: CHEM 36400, PHYS 21102, PHYS 22500, MATH 25500.", completed: false },
  { id: "seed-024", date: "2027-01-07", category: "DEADLINE",  title: "SULI DUE", description: "DOE SULI Summer 2027 deadline (approx, last cycle was Jan 7).", completed: false },
  { id: "seed-025", date: "2027-01-11", category: "DEADLINE",  title: "Faculty outreach DUE", description: "Email UChicago PIs by 2nd week of Winter qtr: Vaikuntanathan, Gagliardi, Galli, Mazziotti, Voth, Ferguson, Cusumano.", completed: false },
  { id: "seed-026", date: "2027-01-15", category: "DEADLINE",  title: "Most apps DUE", description: "Per planning doc: 'Most by Jan 15'. Likely incl. Coastar, Argonne Metcalf.", completed: false },
  { id: "seed-027", date: "2027-01-18", category: "DEADLINE",  title: "Argonne intern DUE", description: "Argonne Undergrad Seasonal Intern (general app) Workday deadline (approx).", completed: false },
  { id: "seed-028", date: "2027-01-25", category: "REMINDER",  title: "Math TA app", description: "Watch math dept for TA/grader app dates.", completed: false },

  // ---- February 2027 ----
  { id: "seed-029", date: "2027-02-01", category: "DEADLINE",  title: "Amgen DUE", description: "Amgen Scholars Summer 2027 deadline (CONFIRMED). 11:59 PM ET.", completed: false },
  { id: "seed-030", date: "2027-02-05", category: "DEADLINE",  title: "NIST SURF DUE", description: "NIST SURF Summer 2027 deadline (approx, typically early Feb).", completed: false },
  { id: "seed-031", date: "2027-02-22", category: "DEADLINE",  title: "Caltech SURF DUE", description: "Caltech SURF Summer 2027 deadline (CONFIRMED).", completed: false },
  { id: "seed-032", date: "2027-02-22", category: "REMINDER",  title: "Reg: Spring '27", description: "Course reg: CHEM 36500, PHYS 24510, PHYS 22700, ARTV 10100.", completed: false },

  // ---- March 2027 ----
  { id: "seed-033", date: "2027-03-01", category: "DEADLINE",  title: "Berkeley SURF DUE", description: "UC Berkeley SURF deadline (approx). Verify external eligibility.", completed: false },
  { id: "seed-034", date: "2027-03-08", category: "UCHICAGO",  title: "Quad Summer DUE", description: "Quad Summer Undergrad Research Scholars deadline (approx). Confirm with CCRF.", completed: false },
  { id: "seed-035", date: "2027-03-08", category: "UCHICAGO",  title: "Quad URS DUE", description: "Quad Undergraduate Research Scholars Program deadline (approx).", completed: false },
  { id: "seed-036", date: "2027-03-08", category: "UCHICAGO",  title: "Norris Grant DUE", description: "James R. Norris Jr. Grant deadline (verify with UChicago Chemistry).", completed: false },
  { id: "seed-037", date: "2027-03-19", category: "ACADEMIC",  title: "Winter qtr ends", description: "UChicago Winter 2027 ends (verify). Spring break.", completed: false },
  { id: "seed-038", date: "2027-03-29", category: "ACADEMIC",  title: "Spring qtr begins", description: "Per plan: CHEM 36500, PHYS 24510, PHYS 22700, ARTV 10100.", completed: false },

  // ---- April 2027 ----
  { id: "seed-039", date: "2027-04-01", category: "MILESTONE", title: "Decisions roll out", description: "Most programs notify mid-March through early April. Have a backup plan.", completed: false },
  { id: "seed-040", date: "2027-04-15", category: "MILESTONE", title: "Commit to offer", description: "If you have multiple offers, commit by mid-April.", completed: false },
  { id: "seed-041", date: "2027-04-26", category: "REMINDER",  title: "Reg: Autumn '27", description: "Year 4: CHEM 31300, CHEM 36300, MATH 23500, MATH 27000.", completed: false },

  // ---- May 2027 ----
  { id: "seed-042", date: "2027-05-01", category: "FELLOWSHIP", title: "K-H prep window", description: "Knight-Hennessy: if applying senior year, start materials. Deadline Oct.", completed: false },
];
