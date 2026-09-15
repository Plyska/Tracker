import type { Locale } from "../i18n";
import { CONTACTS, UPDATED, mail } from "./contacts";
import type { LegalDoc } from "./types";

/**
 * Умови користування — короткі й простою мовою. Кожна норма відповідає реальній поведінці продукту:
 * «безкоштовно на запуску» — бо так і є (`plan` завжди `pro`); застереження про помічника — бо
 * продукт працює з настроєм і щоденником, і людина може сприйняти лист моделі як пораду фахівця;
 * «видалення миттєве й повне» — бо `DELETE /auth/me` каскадний.
 *
 * Див. коментар у `privacy.ts` щодо мов і тону.
 */
const S = CONTACTS.supportEmail;

const en: LegalDoc = {
  title: "Terms of Service",
  lead: "The rules for using Tellday — short, and in plain language. By creating an account you agree to them.",
  updated: UPDATED.en,
  sections: [
    {
      id: "who",
      heading: "Who you are dealing with",
      body: [
        `Tellday is operated by **${CONTACTS.controller.en}**, registered in Ukraine. Questions about these terms: ${mail(S)}. How we handle your data is a separate document — the [Privacy Policy](/privacy).`,
      ],
    },
    {
      id: "service",
      heading: "What Tellday is",
      body: [
        "A personal tracker for habits, mood, diary and a day plan, with an optional AI assistant that reads what you record and writes it back to you as something worth reading.",
        "**It is free at launch, and every feature is included.** If we introduce paid plans later, we will tell you in advance, nothing you already have will disappear without notice, and no card is ever charged without an explicit action from you.",
      ],
    },
    {
      id: "account",
      heading: "Your account",
      body: [
        {
          list: [
            "You must be **16 or older**.",
            "Use an email address you actually control. Password recovery works only through it — a typo in the address makes the account unrecoverable, which is why we ask you to confirm it.",
            "Keep your password to yourself. What happens under your account is your responsibility until you tell us it was compromised.",
            "One person, one account. Tellday is for personal use.",
          ],
        },
      ],
    },
    {
      id: "content",
      heading: "Your content",
      body: [
        "Everything you enter — habits, marks, diary, tasks — is yours. You grant Tellday only the permission needed to store it, show it back to you, compute your statistics and, if you enable the assistant, send the relevant parts to the model provider.",
        "We do not sell your content, do not use it for advertising, and do not train models on it.",
      ],
    },
    {
      id: "use",
      heading: "Acceptable use",
      body: [
        "Use Tellday for what it is built for. In particular, do not:",
        {
          list: [
            "try to access accounts or data that are not yours, or probe the service for weaknesses;",
            "circumvent rate limits, quotas, or any feature we have limited or switched off;",
            "send automated traffic that degrades the service for others;",
            "store content that is unlawful where you live;",
            "use the assistant to produce content that harms others.",
          ],
        },
      ],
    },
    {
      id: "assistant",
      heading: "The AI assistant",
      body: [
        "The assistant is a language model. It can be wrong, incomplete, or confidently mistaken. Its letters and replies are **not medical, psychological or therapeutic advice** and are no substitute for a professional.",
        "If it shows you support resources, that is an invitation to reach out to people — it is **not an emergency service**, and Tellday does not monitor your messages in real time. If you are in danger, contact your local emergency number.",
        "The assistant is subject to a daily quota. Some of its features — currently the open chat — may be limited or unavailable while we work on making them safe.",
      ],
    },
    {
      id: "availability",
      heading: "Availability and changes",
      body: [
        "We work to keep Tellday running, but we do not promise uninterrupted service. We may change, add or remove features. If we ever shut the service down, we will give at least **30 days' notice** and a way to export your data first.",
      ],
    },
    {
      id: "termination",
      heading: "Ending things",
      body: [
        "You can delete your account at any time in **Settings → Profile** — instantly and completely, no questions asked.",
        "We may suspend or delete an account that breaks these terms or the law. Where it is reasonable to do so, we warn you first.",
      ],
    },
    {
      id: "liability",
      heading: "Liability",
      body: [
        "Tellday is provided “as is”. To the extent the law allows, we are not liable for indirect losses, for data you chose not to back up, or for decisions you make based on what the assistant wrote. Nothing in these terms limits the rights you have as a consumer under the law of your country.",
      ],
    },
    {
      id: "law",
      heading: "Governing law",
      body: [
        "These terms are governed by the law of Ukraine. If you live in the European Union, you keep the protections of your own country's consumer law regardless.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      body: [
        "We will notify you of material changes by email or in the app at least **14 days** before they take effect. Continuing to use Tellday after that date means you accept them; if you don't, delete your account before then.",
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      body: [`${mail(S)}`],
    },
  ],
};

const uk: LegalDoc = {
  title: "Умови користування",
  lead: "Правила користування Tellday — коротко й простою мовою. Створюючи акаунт, ви з ними погоджуєтесь.",
  updated: UPDATED.uk,
  sections: [
    {
      id: "who",
      heading: "З ким ви маєте справу",
      body: [
        `Сервіс Tellday надає **${CONTACTS.controller.uk}**, Україна. Питання щодо цих умов: ${mail(S)}. Як ми поводимося з вашими даними — окремий документ, [Політика конфіденційності](/uk/privacy).`,
      ],
    },
    {
      id: "service",
      heading: "Що таке Tellday",
      body: [
        "Особистий трекер навичок, настрою, щоденника і плану дня з необов'язковим AI-помічником, який читає записане й повертає його вам у вигляді тексту, що варто прочитати.",
        "**На момент запуску сервіс безкоштовний, і всі можливості включено.** Якщо згодом з'являться платні тарифи, ми повідомимо заздалегідь, нічого з того, що у вас уже є, не зникне без попередження, а гроші з картки ніколи не списуються без вашої явної дії.",
      ],
    },
    {
      id: "account",
      heading: "Ваш акаунт",
      body: [
        {
          list: [
            "Вам має бути **16 років або більше**.",
            "Використовуйте електронну адресу, до якої справді маєте доступ. Відновлення пароля працює лише через неї — одруківка в адресі робить акаунт безповоротним, саме тому ми просимо її підтвердити.",
            "Не передавайте пароль нікому. За те, що відбувається під вашим акаунтом, відповідаєте ви — доки не повідомите нам, що доступ до нього перехопили.",
            "Одна людина — один акаунт. Tellday призначений для особистого користування.",
          ],
        },
      ],
    },
    {
      id: "content",
      heading: "Ваш контент",
      body: [
        "Усе, що ви вносите — навички, відмітки, щоденник, задачі, — належить вам. Ви надаєте Tellday лише дозвіл, необхідний, щоб це зберігати, показувати вам, рахувати статистику і — якщо ви увімкнули помічника — надсилати потрібні частини провайдеру моделі.",
        "Ми не продаємо ваш контент, не використовуємо його для реклами і не навчаємо на ньому моделі.",
      ],
    },
    {
      id: "use",
      heading: "Правила користування",
      body: [
        "Використовуйте Tellday за призначенням. Зокрема, не можна:",
        {
          list: [
            "намагатися отримати доступ до чужих акаунтів чи даних або шукати в сервісі вразливості;",
            "обходити обмеження частоти запитів, квоти чи будь-які функції, які ми обмежили або вимкнули;",
            "створювати автоматизоване навантаження, яке погіршує роботу сервісу для інших;",
            "зберігати контент, незаконний у країні вашого перебування;",
            "використовувати помічника для створення контенту, що шкодить іншим.",
          ],
        },
      ],
    },
    {
      id: "assistant",
      heading: "AI-помічник",
      body: [
        "Помічник — це мовна модель. Він може помилятися, щось пропускати або впевнено стверджувати хибне. Його листи й відповіді — **не медична, не психологічна і не терапевтична порада** і не замінюють фахівця.",
        "Якщо він показує, куди звернутися по підтримку, — це запрошення поговорити з людьми, а **не служба екстреної допомоги**: Tellday не стежить за вашими повідомленнями в реальному часі. Якщо вам загрожує небезпека, телефонуйте на місцевий номер екстреної служби.",
        "На помічника діє денна квота. Окремі його можливості — зараз це вільна розмова — можуть бути обмежені або недоступні, доки ми працюємо над їхньою безпекою.",
      ],
    },
    {
      id: "availability",
      heading: "Доступність і зміни",
      body: [
        "Ми дбаємо, щоб Tellday працював, але не обіцяємо безперервної доступності. Ми можемо змінювати, додавати чи прибирати функції. Якщо колись доведеться закрити сервіс, ми попередимо щонайменше за **30 днів** і дамо змогу спершу експортувати дані.",
      ],
    },
    {
      id: "termination",
      heading: "Припинення",
      body: [
        "Ви можете видалити акаунт будь-коли в **Налаштуваннях → Профіль** — миттєво й повністю, без зайвих питань.",
        "Ми можемо призупинити або видалити акаунт, що порушує ці умови чи закон. Там, де це розумно, ми спершу попереджаємо.",
      ],
    },
    {
      id: "liability",
      heading: "Відповідальність",
      body: [
        "Tellday надається «як є». У межах, дозволених законом, ми не відповідаємо за непрямі збитки, за дані, які ви не зберегли окремо, і за рішення, ухвалені на підставі написаного помічником. Ніщо в цих умовах не обмежує прав, які ви маєте як споживач за законодавством своєї країни.",
      ],
    },
    {
      id: "law",
      heading: "Застосовне право",
      body: [
        "Ці умови регулюються законодавством України. Якщо ви мешкаєте в Європейському Союзі, за вами в будь-якому разі зберігається захист споживчого права вашої країни.",
      ],
    },
    {
      id: "changes",
      heading: "Зміни цих умов",
      body: [
        "Про суттєві зміни ми повідомимо листом або в застосунку щонайменше за **14 днів** до набуття чинності. Якщо після цієї дати ви продовжуєте користуватися Tellday — ви з ними погоджуєтесь; якщо ні — видаліть акаунт до неї.",
      ],
    },
    {
      id: "contact",
      heading: "Контакти",
      body: [`${mail(S)}`],
    },
  ],
};

export const TERMS: Record<Locale, LegalDoc> = { en, uk };
