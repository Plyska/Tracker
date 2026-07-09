export {
  default as uiPrefsReducer,
  setHabitColWidth,
  setTableLayout,
  setStatsGoal,
  toggleStatWidget,
  setHiddenStatWidgets,
  setAllowEditingPastDays,
  setTaskListStyle,
  setEditorScale,
  HABIT_COL_MIN,
  HABIT_COL_MAX,
  EDITOR_SCALE_MIN,
  EDITOR_SCALE_MAX,
  type UiPrefsState,
  type TableLayout,
  type TaskListStyle,
} from "./model/uiPrefsSlice";
export { TableLayoutSwitcher } from "./ui/TableLayoutSwitcher";
export { EditPastDaysToggle } from "./ui/EditPastDaysToggle";
export { TaskListStyleSwitcher } from "./ui/TaskListStyleSwitcher";
