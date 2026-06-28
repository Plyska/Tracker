import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { LOCALES, type Locale } from "@/shared/config/i18n";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { setLocale } from "../model/localeSlice";

export function LangSwitcher() {
  const locale = useAppSelector((s) => s.locale.value);
  const dispatch = useAppDispatch();
  const current = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline">
          <Languages className="h-4 w-4" />
          {current.label}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className={cn(
            "z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-card",
            "origin-(--radix-dropdown-menu-content-transform-origin)",
          )}
        >
          <DropdownMenu.RadioGroup
            value={locale}
            onValueChange={(value) => dispatch(setLocale(value as Locale))}
          >
            {LOCALES.map((l) => (
              <DropdownMenu.RadioItem
                key={l.value}
                value={l.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-3 text-sm",
                  "outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                  "data-[state=checked]:font-medium",
                )}
              >
                <DropdownMenu.ItemIndicator className="absolute left-2 inline-flex">
                  <Check className="h-4 w-4" />
                </DropdownMenu.ItemIndicator>
                {l.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
