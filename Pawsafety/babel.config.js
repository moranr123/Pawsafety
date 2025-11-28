module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: [
          // Remove console.logs in production (keeps console.error and console.warn)
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};

