-- Форма звертання на момент генерації листа — для валідності кешу.
-- NULL = рядок згенеровано до появи поля; трактується як 'neutral'.
ALTER TABLE "AiReflection" ADD COLUMN "addressForm" TEXT;
