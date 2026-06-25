import { useEffect, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectIsAuthenticated, useGetMeQuery, userLoaded } from "@/features/auth";

/**
 * Рехідрація сесії на буті. Сесія миттєво відновлюється з persisted-стану (без флешу), а тут
 * фоново валідуємо її проти бекенду через `GET /auth/me`:
 *  - успіх → оновлюємо `user` свіжими даними (plan/role/ім'я);
 *  - 401 → httpBaseQuery пробує тихий refresh; якщо й він не вдався — сам диспатчить logout
 *    (тут нічого робити не треба). Мережева помилка (не 401) сесію не скидає.
 * Запит пропускаємо для анонімних (`skip`).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const dispatch = useAppDispatch();
  const { data: user } = useGetMeQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (user) dispatch(userLoaded(user));
  }, [user, dispatch]);

  return children;
}
