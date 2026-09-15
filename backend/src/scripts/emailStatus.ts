import { config } from "dotenv";

/**
 * `npm run email:status` — у якому стані домен відправника в Resend і які DNS-записи він чекає.
 *
 * Окрема команда, бо це питання виникає не раз: домен верифікують не миттєво (DNS розповзається
 * до години), а панель провайдера не завжди під рукою. Дістаємо значення з самого API, а не з
 * документації: Resend уже міняв схему записів (MX + TXT SPF → CNAME), і гайди в інтернеті —
 * разом із нашим `docs/email-setup.md` — застарівають мовчки.
 *
 * Читає лише ключ; нічого не надсилає й нічого не змінює.
 */
config();

const KEY = process.env.RESEND_API_KEY;

const main = async (): Promise<void> => {
  if (!KEY) {
    console.error("RESEND_API_KEY не заданий у backend/.env — транспорт зараз `console`.");
    process.exitCode = 1;
    return;
  }

  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) {
    // Тіло містить причину (невірний/відкликаний ключ), але друкуємо коротко й без самого ключа.
    console.error(`Resend відповів ${res.status}: ${(await res.text()).slice(0, 200)}`);
    process.exitCode = 1;
    return;
  }

  const { data } = (await res.json()) as { data?: { id: string; name: string }[] };
  if (!data?.length) {
    console.log("У Resend не додано жодного домену → доступний лише onboarding@resend.dev,");
    console.log("і він шле листи ТІЛЬКИ на адресу власника акаунта.");
    return;
  }

  for (const { id, name } of data) {
    const domain = (await (
      await fetch(`https://api.resend.com/domains/${id}`, {
        headers: { Authorization: `Bearer ${KEY}` },
      })
    ).json()) as { name: string; status: string; region?: string; records?: Record<string, unknown>[] };

    console.log(`\n${name} — ${domain.status}${domain.region ? ` (${domain.region})` : ""}`);
    for (const r of domain.records ?? []) {
      const rec = r as { status: string; type: string; name: string; value: string };
      console.log(`  [${rec.status}] ${rec.type.padEnd(5)} ${rec.name.padEnd(20)} → ${rec.value}`);
    }
    if (domain.status !== "verified") {
      console.log("\n  Записи додають у Porkbun (Domain Management → DNS). У полі Host — лише");
      console.log("  піддомен, без `.tellday.app`. Далі кнопка Verify у панелі Resend.");
    }
  }
};

void main();
