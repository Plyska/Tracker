import StarterKit from "@tiptap/starter-kit";
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
} from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extension-placeholder";
import type { Extensions } from "@tiptap/react";

/**
 * Набір розширень «багатого» редактора щоденника: базове форматування (StarterKit —
 * жирний/курсив/підкреслення/закреслення, заголовки, списки, цитати, посилання, undo/redo)
 * + шрифт, розмір, колір, виділення, вирівнювання, чеклисти, плейсхолдер.
 */
export function buildEditorExtensions(placeholder?: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      },
    }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Highlight,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: placeholder ?? "" }),
  ];
}
