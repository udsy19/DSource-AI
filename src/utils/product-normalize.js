export const sanitizeString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

export const parseArrayField = (value) => {
  const raw = sanitizeString(value);
  if (!raw) return null;
  const entries = raw
    .split(/[,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length ? entries : null;
};

export const parseMultiValue = (value) => {
  const raw = sanitizeString(value);
  if (!raw) return null;
  const entries = raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length ? entries : null;
};

export const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
