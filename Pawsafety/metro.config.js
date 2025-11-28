const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      keep_classnames: false,
      keep_fnames: false,
      mangle: {
        keep_classnames: false,
        keep_fnames: false,
      },
    },
  };
  
  config.serializer = {
    ...config.serializer,
    // Optimize bundle size
    createModuleIdFactory: () => {
      let nextId = 0;
      return () => nextId++;
    },
  };
}

module.exports = config;

