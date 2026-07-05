export {
  default as uiPrefsReducer,
  setHabitColWidth,
  setTableLayout,
  setStatsGoal,
  toggleStatWidget,
  setHiddenStatWidgets,
  setAllowEditingPastDays,
  HABIT_COL_MIN,
  HABIT_COL_MAX,
  type UiPrefsState,
  type TableLayout,
} from "./model/uiPrefsSlice";
export { TableLayoutSwitcher } from "./ui/TableLayoutSwitcher";
export { EditPastDaysToggle } from "./ui/EditPastDaysToggle";
