import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { env } from "../env.js";

/**
 * Спільне сховище лічильників rate-limit (Upstash Redis).
 *
 * Навіщо: на Vercel застосунок їде як Function на Fluid compute, тобто інстансів може бути
 * кілька. Дефолтний `MemoryStore` тримає лічильники в пам'яті процесу, тож кожен інстанс веде
 * власний — і фактичний ліміт стає «ліміт × кількість інстансів». Найгірше тут не сама слабкість,
 * а момент її настання: захист від перебору паролів тихо слабшає рівно тоді, коли трафік росте,
 * тобто коли він найпотрібніший, і в логах це ніяк не видно.
 *
 * Чому Upstash саме REST, а не звичайний Redis-клієнт: TCP-з'єднання передбачає довгоживучий
 * процес і пул, чого на serverless немає — кожен інстанс відкривав би своє й тримав його даремно.
 * REST — це звичайний HTTPS-запит без стану, що точно лягає на модель виконання.
 *
 * Без налаштованих змінних сховище не створюється, і лімітери лишаються на `MemoryStore` — для
 * локальної розробки це правильна поведінка (піднімати Redis заради `npm run dev` не треба).
 */

interface PipelineResult {
  result?: number;
  error?: string;
}

class UpstashStore implements Store {
  /** Лічильники чужі серед інших ключів БД — префікс, щоб їх було видно й легко чистити. */
  prefix = "rl:";
  /** Сховище спільне для всіх інстансів — інакше express-rate-limit попереджає про подвійний облік. */
  localKeys = false;

  private windowMs = 60_000;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private async pipeline(commands: (string | number)[][]): Promise<PipelineResult[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
    if (!res.ok) {
      // Тіло містить причину (невірний токен, ліміт плану), але НЕ ключі — у них IP-адреси
      // й id користувачів, а логи не місце для них.
      throw new Error(`Upstash responded ${res.status}: ${(await res.text().catch(() => "")).slice(0, 120)}`);
    }
    return (await res.json()) as PipelineResult[];
  }

  /**
   * Один похід у мережу на три команди — лічильник, термін і залишок часу.
   *
   * `PEXPIRE ... NX` ставить термін **лише якщо його ще немає**. Без `NX` кожен запит зсував би
   * вікно вперед, і воно ніколи б не закінчувалось: той, хто стукає часто, ніколи не дочекався б
   * скидання — а це протилежне до «N спроб за 15 хвилин».
   */
  async increment(key: string): Promise<ClientRateLimitInfo> {
    const [incr, , pttl] = await this.pipeline([
      ["INCR", this.prefix + key],
      ["PEXPIRE", this.prefix + key, this.windowMs, "NX"],
      ["PTTL", this.prefix + key],
    ]);

    const totalHits = incr?.result ?? 1;
    const ms = pttl?.result ?? this.windowMs;
    return {
      totalHits,
      // PTTL віддає -1 (без терміну) чи -2 (немає ключа) — обидва означають, що рахувати
      // залишок нема з чого, тож беремо повне вікно.
      resetTime: new Date(Date.now() + (ms > 0 ? ms : this.windowMs)),
    };
  }

  /** Відкат лічильника — для `skipSuccessfulRequests` в `authLimiter` (успішний вхід не «з'їдає» ліміт). */
  async decrement(key: string): Promise<void> {
    await this.pipeline([["DECR", this.prefix + key]]);
  }

  async resetKey(key: string): Promise<void> {
    await this.pipeline([["DEL", this.prefix + key]]);
  }
}

/**
 * Сховище для лімітерів або `undefined` — тоді express-rate-limit візьме свій `MemoryStore`.
 *
 * Один екземпляр на процес: стану він майже не тримає, а `init` кожен лімітер викликає свій —
 * тому `windowMs` у спільного екземпляра був би від останнього. Через це створюємо **новий**
 * екземпляр на кожен виклик: лімітерів одиниці, а плутанина з вікнами коштувала б дорого.
 */
export const createRateLimitStore = (): Store | undefined =>
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new UpstashStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
    : undefined;

/** Чи лічильники спільні — для стартового попередження в `app.ts`. */
export const hasSharedRateLimitStore = (): boolean =>
  Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
