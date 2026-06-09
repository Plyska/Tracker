import { useTranslation } from "react-i18next";
import { AccentPicker } from "@/features/accent";
import { LangSwitcher } from "@/features/locale";
import { TableLayoutSwitcher } from "@/features/ui-prefs";
import { AnimatedText, Card } from "@/shared/ui";

function SettingsPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <p className="text-muted-foreground">
        <AnimatedText>{t("settings.subtitle")}</AnimatedText>
      </p>

      <Card>
        <AccentPicker />
      </Card>

      <Card className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            <AnimatedText>{t("settings.language.title")}</AnimatedText>
          </h3>
          <p className="text-sm text-muted-foreground">
            <AnimatedText>{t("settings.language.description")}</AnimatedText>
          </p>
        </div>
        <LangSwitcher />
      </Card>

      <Card>
        <TableLayoutSwitcher />
      </Card>
    </section>
  );
}

export default SettingsPage;
