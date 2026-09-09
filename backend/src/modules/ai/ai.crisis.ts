import { getAiProvider } from "./ai.client.js";
import { CRISIS_CLASSIFIER_SCHEMA, crisisClassifierPrompt } from "./ai.prompts.js";
import { consumeQuota } from "./ai.quota.js";

/**
 * Кризовий скрин — один крихітний виклик із перевірною відповіддю «так/ні».
 *
 * Спільна точка для всіх поверхонь навмисно: поки рішення «криза чи ні» ухвалював головний
 * промпт кожної поверхні, воно розходилось. Лист із явними думками про смерть відповідав звітом
 * про звички (B1), а чек-ін на «хочеться зникнути на тиждень» видавав гарячі лінії (B2) —
 * помилки в обидва боки, і кожну довелося б лікувати правкою свого промпту. Тут питання одне,
 * і поріг налаштовується в одному місці.
 *
 * Заміряно на 16 пастках (ідіоми про смерть, заперечення, згадки про інших): 100% точності,
 * 89% повноти — саме той профіль, який потрібен. Хибне спрацювання коштує довіри, тож головний
 * промпт лишається широкою сіткою, а це — фільтром.
 *
 * Отримує ЛИШЕ текст людини — строгу підмножину того, що й так їде в основний виклик. Нової
 * експозиції даних немає: той самий провайдер, менше даних, окремий дзвінок.
 *
 * Помилка **не кидається назовні**: якщо провайдер лежить, краще віддати звичайну відповідь
 * (у листі є поле `care`, у чек-іні — тепла репліка), ніж не дати нічого.
 */
export async function screenForCrisis(
  provider: ReturnType<typeof getAiProvider>,
  texts: { date: string; text: string }[],
  userId: string,
  today: string,
): Promise<boolean> {
  if (texts.length === 0) return false;
  try {
    const result = await provider.generateJson({
      system: crisisClassifierPrompt(),
      user: `Записи:\n${texts.map((d, i) => `${i + 1}. ${d.date}: ${d.text}`).join("\n")}`,
      schema: CRISIS_CLASSIFIER_SCHEMA,
      maxOutputTokens: 300,
      effort: "low",
      // Запобіжник мусить бути відтворюваним: на дефолтній температурі та сама фраза давала
      // різні вердикти між прогонами (2 хибних з 8). Тут випадковість не купує нічого.
      temperature: 0,
    });
    await consumeQuota(userId, today, result.inputTokens, result.outputTokens);
    // Лише "crisis" вмикає кризову відповідь: "distress" — це важкий тиждень, і на нього в
    // застосунку є свої, м'якші канали (поле `care` в листі, тепла репліка в чек-іні).
    return (JSON.parse(result.text) as { verdict?: string }).verdict === "crisis";
  } catch (e) {
    console.error("[ai] crisis screening failed — letting the normal reply through:", e);
    return false;
  }
}
