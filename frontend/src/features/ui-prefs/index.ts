export {
  default as uiPrefsReducer,
  setHabitColWidth,
  setTableLayout,
  setStatsGoal,
  toggleStatWidget,
  setHiddenStatWidgets,
  HABIT_COL_MIN,
  HABIT_COL_MAX,
  type UiPrefsState,
  type TableLayout,
} from "./model/uiPrefsSlice";
export { TableLayoutSwitcher } from "./ui/TableLayoutSwitcher";
