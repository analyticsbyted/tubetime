// PostCSS config - use CommonJS for webpack compatibility
// Next.js webpack requires plugins to be specified as strings
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
  },
};
