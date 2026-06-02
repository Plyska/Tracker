import { useTranslation } from "react-i18next";
import { AccentPicker } from "@/features/accent";
import { LangSwitcher } from "@/features/locale";
import { Card } from "@/shared/ui";

function SettingsPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header>
        <h2 className="text-2xl font-bold">{t("settings.title")}</h2>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </header>

      <Card>
        <AccentPicker />
      </Card>

      <Card className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            {t("settings.language.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("settings.language.description")}
          </p>
        </div>
        <LangSwitcher />
      </Card>
    </section>
  );
}

export default SettingsPage;
