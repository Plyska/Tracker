export {
  default as uiPrefsReducer,
  setHabitColWidth,
  setTableLayout,
  setStatsGoal,
  toggleStatWidget,
  setHiddenStatWidgets,
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
export { TaskListStyleSwitcher } from "./ui/TaskListStyleSwitcher";
