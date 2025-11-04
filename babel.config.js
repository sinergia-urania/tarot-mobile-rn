// babel.config.js
module.exports = function (api) {
    api.cache(true);
    const prodPlugins = process.env.NODE_ENV === 'production'
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : [];

    return {
        presets: ['babel-preset-expo'],
        plugins: [
            ...prodPlugins,
            'react-native-reanimated/plugin', // mora poslednji
        ],
    };
};
