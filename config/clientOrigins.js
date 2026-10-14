const normalizeOrigin = (value = '') => {
  if (!value) return '';
  return value.trim().replace(/\/?$/, '').replace(/\/+$/, '');
};

const splitOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
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

const getPrimaryOrigin = () => {
  if (process.env.CLIENT_URL) return normalizeOrigin(process.env.CLIENT_URL);
  return allowedOrigins[0] || 'http://localhost:5173';
};

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
