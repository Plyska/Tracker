import { useMemo } from "react";
import { cn } from "@/shared/lib";
import { sanitizeRichText } from "./lib";
import "./richText.css";

/** Read-only рендер збереженого rich-text HTML (санітизований). Ті самі `.rich-text` стилі. */
export function RichTextContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const clean = useMemo(() => sanitizeRichText(html), [html]);
  return (
    <div
      className={cn("rich-text", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
