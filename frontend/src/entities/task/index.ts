export type { Task } from "./model/types";
export {
  useGetTasksQuery,
  useAddTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useClearTasksMutation,
} from "./api/tasksApi";
