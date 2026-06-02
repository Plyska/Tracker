import { useTranslation } from "react-i18next";

function StatisticsPage() {
  const { t } = useTranslation();

  return (
    <section>
      <p className="text-muted-foreground">{t("statistics.placeholder")}</p>
    </section>
  );
}

export default StatisticsPage;
