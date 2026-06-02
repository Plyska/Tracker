import { useTranslation } from "react-i18next";

function LoginPage() {
  const { t } = useTranslation();

  return (
    <section>
      <h2>{t("auth.login")}</h2>
    </section>
  );
}

export default LoginPage;
