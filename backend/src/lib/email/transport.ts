import { env } from "../../env.js";

/**
 * Шов транзакційної пошти.
 *
 * Той самий принцип, що з AI-провайдером (`modules/ai/ai.client.ts`): реалізація за вузьким
 * інтерфейсом, вибір — через env, зміна провайдера не торкається жодного виклику. Тут це важить
 * навіть більше: постачальника пошти міняють через доставлюваність, і це рішення ухвалюють уже
 * після запуску, дивлячись на реальні відмови.
 *
 * `console` — не заглушка «щоб компілювалось», а робочий режим розробки. Обидва флоу (підтвердження
 * і скидання) проходяться повністю до того, як зʼявиться домен із SPF/DKIM: посилання друкується
 * в stdout, і його можна відкрити. У проді такий транспорт заборонено (guard в `env.ts`).
 */
export interface EmailMessage {
  to: string;
  subject: string;
  /** Текстова версія — обовʼязкова: частина клієнтів HTML не показує, а лист про пароль мусить дійти. */
  text: string;
  html: string;
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Resend через звичайний `fetch` — без SDK.
 *
 * API тут — один POST, і залежність заради нього платиться щомісяця: оновленнями, аудитом,
 * розміром. Той самий вибір зроблено для OpenAI-сумісного AI-провайдера.
 */
class ResendTransport implements EmailTransport {
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!res.ok) {
      // Тіло відповіді містить причину (невірний домен, ліміт), але НЕ адресата — його сюди не
      // тягнемо: логи не місце для чужої пошти.
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend responded ${res.status}: ${detail.slice(0, 200)}`);
    }
  }
}

/** Розробка: лист у stdout. Посилання видно й можна відкрити — цього достатньо для наскрізного тесту. */
class ConsoleTransport implements EmailTransport {
  send(message: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      ["", "── EMAIL (console transport) ──", `to:      ${message.to}`, `subject: ${message.subject}`, "", message.text, "───────────────────────────────", ""].join(
        "\n",
      ),
    );
    return Promise.resolve();
  }
}

let cached: EmailTransport | null = null;

export const getEmailTransport = (): EmailTransport => {
  if (cached) return cached;
  cached =
    env.emailProvider === "resend" && env.RESEND_API_KEY
      ? new ResendTransport(env.RESEND_API_KEY)
      : new ConsoleTransport();
  return cached;
};

/**
 * Надіслати лист, **не валячи запит**, якщо провайдер лежить.
 *
 * Свідомо так у всіх викликах: ендпоінти цих флоу віддають 204 незалежно від результату, щоб не
 * розкривати, чи існує адреса. Якби збій пошти піднімався до 500, форма «забув пароль» стала б
 * саме тим детектором існування акаунтів, від якого ми захищаємось.
 *
 * Ціна — тихий збій, тому пишемо в лог: без цього рядка не буде як зрозуміти, чому листи не йдуть.
 */
export const sendEmailSafely = async (message: EmailMessage): Promise<void> => {
  try {
    await getEmailTransport().send(message);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[email] send failed:", e instanceof Error ? e.message : String(e));
  }
};
