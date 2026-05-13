const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const sanitizeString = (value) => String(value).replace(CONTROL_CHARS_REGEX, "");

const sanitizeFormData = (formData) => {
  const next = new FormData();

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      next.append(key, sanitizeString(value));
      continue;
    }

    next.append(key, value);
  }

  return next;
};

export const sanitizePayload = (value) => {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (value instanceof FormData) {
    return sanitizeFormData(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizePayload(nestedValue)])
    );
  }

  return value;
};

export const sanitizeInputValue = (value) => sanitizeString(value);
