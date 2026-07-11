import { type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link as LinkIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/shared/lib";

const FONT_FAMILIES = [
  { labelKey: "editor.font.default", value: "" },
  { label: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "ui-serif, Georgia, Cambria, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

const FONT_SIZES = [
  { labelKey: "editor.size.default", value: "" },
  { label: "S", value: "14px" },
  { label: "M", value: "18px" },
  { label: "L", value: "24px" },
  { label: "XL", value: "32px" },
];

function Btn({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      // Не даємо втратити виділення при кліку в тулбар.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-border" />;

const selectClass =
  "h-8 shrink-0 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent";

/** Панель форматування rich-text-редактора. Активні стани — через `useEditorState`. */
export function EditorToolbar({
  editor,
  onCollapse,
}: {
  editor: Editor;
  onCollapse?: () => void;
}) {
  const { t } = useTranslation();
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      taskList: editor.isActive("taskList"),
      blockquote: editor.isActive("blockquote"),
      link: editor.isActive("link"),
      highlight: editor.isActive("highlight"),
      alignLeft: editor.isActive({ textAlign: "left" }),
      alignCenter: editor.isActive({ textAlign: "center" }),
      alignRight: editor.isActive({ textAlign: "right" }),
      alignJustify: editor.isActive({ textAlign: "justify" }),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
      fontFamily:
        (editor.getAttributes("textStyle").fontFamily as string) ?? "",
      fontSize: (editor.getAttributes("textStyle").fontSize as string) ?? "",
      color: (editor.getAttributes("textStyle").color as string) ?? "",
    }),
  });

  const chain = () => editor.chain().focus();

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("editor.linkPrompt"), prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5">
      {onCollapse && (
        <>
          <Btn label={t("editor.hideToolbar")} onClick={onCollapse}>
            <ChevronUp className="h-4 w-4" />
          </Btn>
          <Divider />
        </>
      )}
      <Btn
        label={t("editor.undo")}
        disabled={!s.canUndo}
        onClick={() => chain().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.redo")}
        disabled={!s.canRedo}
        onClick={() => chain().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </Btn>

      <Divider />

      <Btn
        label={t("editor.bold")}
        active={s.bold}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.italic")}
        active={s.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.underline")}
        active={s.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.strike")}
        active={s.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Btn>

      <Divider />

      <Btn
        label={t("editor.h1")}
        active={s.h1}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.h2")}
        active={s.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.h3")}
        active={s.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </Btn>

      <Divider />

      {/* Шрифт */}
      <select
        aria-label={t("editor.fontFamily")}
        title={t("editor.fontFamily")}
        value={s.fontFamily}
        onChange={(e) => {
          const v = e.target.value;
          if (v) chain().setFontFamily(v).run();
          else chain().unsetFontFamily().run();
        }}
        className={selectClass}
      >
        {FONT_FAMILIES.map((f) => (
          <option
            key={f.value}
            value={f.value}
            style={{ fontFamily: f.value || undefined }}
          >
            {f.labelKey ? t(f.labelKey) : f.label}
          </option>
        ))}
      </select>

      {/* Розмір */}
      <select
        aria-label={t("editor.fontSize")}
        title={t("editor.fontSize")}
        value={s.fontSize}
        onChange={(e) => {
          const v = e.target.value;
          if (v) chain().setFontSize(v).run();
          else chain().unsetFontSize().run();
        }}
        className={selectClass}
      >
        {FONT_SIZES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.labelKey ? t(f.labelKey) : f.label}
          </option>
        ))}
      </select>

      {/* Колір тексту */}
      <label
        title={t("editor.color")}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
      >
        <input
          type="color"
          aria-label={t("editor.color")}
          value={s.color || "#000000"}
          onChange={(e) => chain().setColor(e.target.value).run()}
          className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>

      <Btn
        label={t("editor.highlight")}
        active={s.highlight}
        onClick={() => chain().toggleHighlight().run()}
      >
        <Highlighter className="h-4 w-4" />
      </Btn>

      <Divider />

      <Btn
        label={t("editor.bulletList")}
        active={s.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.orderedList")}
        active={s.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.taskList")}
        active={s.taskList}
        onClick={() => chain().toggleTaskList().run()}
      >
        <ListChecks className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.blockquote")}
        active={s.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </Btn>
      <Btn label={t("editor.link")} active={s.link} onClick={setLink}>
        <LinkIcon className="h-4 w-4" />
      </Btn>

      <Divider />

      <Btn
        label={t("editor.alignLeft")}
        active={s.alignLeft}
        onClick={() => chain().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.alignCenter")}
        active={s.alignCenter}
        onClick={() => chain().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.alignRight")}
        active={s.alignRight}
        onClick={() => chain().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Btn>
      <Btn
        label={t("editor.alignJustify")}
        active={s.alignJustify}
        onClick={() => chain().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </Btn>
    </div>
  );
}
