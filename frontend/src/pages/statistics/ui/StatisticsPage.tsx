import { useTranslation } from "react-i18next";

function StatisticsPage() {
  const { t } = useTranslation();

  return (
    <section>
      <h2>{t("statistics.title")}</h2>
      <p>{t("statistics.placeholder")}</p>
    </section>
  );
}

export default StatisticsPage;
