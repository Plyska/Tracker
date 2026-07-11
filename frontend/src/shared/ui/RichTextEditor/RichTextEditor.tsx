import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib";
import { buildEditorExtensions } from "./extensions";
import { EditorToolbar } from "./Toolbar";
import "./richText.css";

interface RichTextEditorProps {
  /** Початковий HTML (незакерований — зовнішній reset через `key`). */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Чи розгорнута панель інструментів за замовчуванням (типово `true`). */
  defaultToolbarOpen?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
  defaultToolbarOpen = true,
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const [toolbarOpen, setToolbarOpen] = useState(defaultToolbarOpen);

  const editor = useEditor({
    extensions: buildEditorExtensions(placeholder),
    content: value,
    autofocus: autoFocus ? "end" : false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Внутрішній скрол керується обгорткою EditorContent (flex-1); тут — лише мін-висота.
        class: "rich-text min-h-40 px-3.5 py-2.5",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-md border border-input focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      {editor &&
        (toolbarOpen ? (
          <EditorToolbar
            editor={editor}
            onCollapse={() => setToolbarOpen(false)}
          />
        ) : (
          <div className="flex border-b border-border p-1.5">
            <button
              type="button"
              onClick={() => setToolbarOpen(true)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground outline-none",
                "transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <ChevronDown className="h-4 w-4" />
              {t("editor.showToolbar")}
            </button>
          </div>
        ))}
      <EditorContent
        editor={editor}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto"
      />
    </div>
  );
}
