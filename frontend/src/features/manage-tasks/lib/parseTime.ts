const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Живе маскування під час набору: цифри → 'HH:mm' (двокрапка після годин).
 * «1» → «1», «12» → «12», «123» → «12:3», «1230» → «12:30». Некоректні символи ігноруються.
 */
export const formatTimeInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

/**
 * Нормалізувати введену годину → 'HH:mm' | '' (порожньо, очистити) | null (невалідно, відкотити).
 * Приймає «9», «930», «0930», «9:5», «09:00» тощо.
 */
export const parseTimeInput = (raw: string): string | "" | null => {
  const s = raw.trim();
  if (s === "") return "";
  let h: number;
  let m: number;
  if (s.includes(":")) {
    const [hs, ms = "0"] = s.split(":");
    if (!/^\d{1,2}$/.test(hs) || !/^\d{1,2}$/.test(ms)) return null;
    h = +hs;
    m = +ms;
  } else if (/^\d+$/.test(s)) {
    if (s.length <= 2) [h, m] = [+s, 0];
    else if (s.length === 3) [h, m] = [+s.slice(0, 1), +s.slice(1)];
    else if (s.length === 4) [h, m] = [+s.slice(0, 2), +s.slice(2)];
    else return null;
  } else return null;
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
};
