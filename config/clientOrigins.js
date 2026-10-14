const normalizeOrigin = (value = '') => {
  if (!value) return '';
  return value.trim().replace(/\/?$/, '').replace(/\/+$/, '');
};

const splitOrigins = () => {
  const origins = [];
  if (process.env.CLIENT_URLS) {
    origins.push(...process.env.CLIENT_URLS.split(','));
  }
  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }
  return origins
    .map(normalizeOrigin)
    .filter(Boolean)
    .filter((origin, index, arr) => arr.indexOf(origin) === index);
};

const allowedOrigins = splitOrigins();

const isOriginAllowed = (origin) => {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  return allowedOrigins.includes(normalized);
};

const getPrimaryOrigin = () => allowedOrigins[0] || '';

const pickValidOrigin = (candidate) => {
  if (candidate && isOriginAllowed(candidate)) {
    return normalizeOrigin(candidate);
  }
  return getPrimaryOrigin();
};

module.exports = {
  allowedOrigins,
  isOriginAllowed,
  getPrimaryOrigin,
  pickValidOrigin,
};
