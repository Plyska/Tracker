export {
  default as statsPeriodReducer,
  setStatsScale,
  setStatsHabit,
  type StatsScale,
} from "./model/statsPeriodSlice";
export {
  getStatsRange,
  getPreviousStatsRange,
  type StatsRange,
} from "./lib/range";
export { useStatsData } from "./lib/useStatsData";
export { buildComparison, type StatsComparison } from "./lib/comparison";
export { buildMovers, type Movers, type HabitMover } from "./lib/movers";
