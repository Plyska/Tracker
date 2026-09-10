-- Форма звертання до людини (граматичний рід) для AI-помічника.
-- NULL = не задано → нейтральні формулювання, тобто поточна поведінка без змін.
ALTER TABLE "UserPreferences" ADD COLUMN "aiAddressForm" TEXT;
