import { useTranslation } from "react-i18next";

function RegisterPage() {
  const { t } = useTranslation();

  return (
    <section>
      <h2>{t("auth.register")}</h2>
    </section>
  );
}

export default RegisterPage;
