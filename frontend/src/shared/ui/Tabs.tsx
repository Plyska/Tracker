import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { Tabs as RadixTabs } from "radix-ui";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export interface TabItem {
  value: string;
  label: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  /** Активний таб для контрольованого режиму. */
  value?: string;
  /** Стартовий таб для неконтрольованого режиму. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Горизонтальне центрування смуги табів. */
  centered?: boolean;
  "aria-label"?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Реюзабельні таби (Radix Tabs + анімований pill). Активний індикатор — спільний `layoutId`
 * (як segmented-control у Planner/period-navigation), під `useReducedMotion`. Панелі —
 * `<TabsContent value=…>` серед `children`. Клавіатура/ролі — від Radix.
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  centered = false,
  "aria-label": ariaLabel,
  className,
  children,
}: TabsProps) {
  const reduceMotion = useReducedMotion();
  const pillId = useId();
  // Дзеркалимо активне значення локально, щоб знати, під якою кнопкою малювати pill
  // (працює і в контрольованому, і в неконтрольованому режимі).
  const [active, setActive] = useState(value ?? defaultValue ?? items[0]?.value);
  const current = value ?? active;

  const handleChange = (next: string) => {
    setActive(next);
    onValueChange?.(next);
  };

  return (
    <RadixTabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleChange}
      className={className}
    >
      <RadixTabs.List
        aria-label={ariaLabel}
        className={cn(
          "mb-6 flex w-fit gap-1 rounded-lg border border-border bg-muted p-1",
          centered && "mx-auto",
        )}
      >
        {items.map((item) => {
          const isActive = item.value === current;
          return (
            <RadixTabs.Trigger
              key={item.value}
              value={item.value}
              className={cn(
                // min-w + text-center → усі таби однакової ширини (за найширшим), незалежно від довжини тексту.
                "relative min-w-28 rounded-md px-5 py-2 text-center text-sm font-medium transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={pillId}
                  className="absolute inset-0 rounded-md bg-primary shadow-card"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </RadixTabs.Trigger>
          );
        })}
      </RadixTabs.List>

      {children}
    </RadixTabs.Root>
  );
}

/** Панель таба. Тонка обгортка над Radix — тримає публічний API `shared/ui` замкненим. */
export function TabsContent(props: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content {...props} />;
}
