import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/app/store/hooks";
import { paths } from "@/shared/config/paths";
import { selectIsAuthenticated } from "../model/authSlice";

/**
 * Гард для /auth/*: залогінених не пускає на форми входу → на dashboard.
 *
 * Питання, на яке він відповідає, — **«чи пускати сюди»**, а не «що робити, якщо людина
 * залогінилась, поки була тут». Тому стан знімається **на вході на сторінку** й далі не
 * перечитується.
 *
 * Без цього знімка гард перехоплював власні переходи форм. `RegisterForm` спершу диспатчить
 * `loginSuccess`, а потім веде на `/verify-email`; диспатч встигає промалювати кадр, де людина
 * вже залогінена, але адреса ще `/auth/register` — і гард, побачивши цей кадр, ставив у чергу
 * перехід на дашборд. Той спрацьовував уже після переходу форми й затирав його: екран із кодом
 * підтвердження блимав і зникав, тобто ключовий крок реєстрації просто не діставався людині.
 * У `LoginForm` та сама гонка з'їдала `from` — вхід із приватного посилання кидав на дашборд
 * замість сторінки, куди людина йшла.
 *
 * Знімок безпечний, бо сесія відновлюється **синхронно** з persisted-стану (`readPersistedAuth`
 * у сторі), а `SessionProvider` її лише валідує: стану «на першому кадрі анонім, а за мить
 * залогінений» тут не буває — окрім того самого входу/реєстрації, які й мають вести самі.
 */
export function RedirectIfAuth() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [wasAuthenticatedOnEntry] = useState(isAuthenticated);

  if (wasAuthenticatedOnEntry) {
    return <Navigate to={paths.dashboard} replace />;
  }

  return <Outlet />;
}
