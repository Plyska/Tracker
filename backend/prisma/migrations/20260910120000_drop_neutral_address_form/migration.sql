-- «neutral» більше не є вибором користувача: у прогоні заборонна інструкція («не вживай форм із
-- родом») не виконувалась — кризова відповідь у чаті давала «ти не один» 3 рази з 3.
-- Лишились masculine | feminine; NULL = не питали (напр. згода дана на англійському інтерфейсі).
UPDATE "UserPreferences" SET "aiAddressForm" = NULL WHERE "aiAddressForm" = 'neutral';
UPDATE "AiReflection"     SET "addressForm"   = NULL WHERE "addressForm"   = 'neutral';
