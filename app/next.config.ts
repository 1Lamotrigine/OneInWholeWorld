import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  devIndicators: false,
  agentRules: false,
  transpilePackages: ['@electric-sql/pglite'],
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      // PGlite's universal WASM loader imports these only on its Node branch.
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^node:(module|fs|path|url|crypto)$/, (resource: { request: string }) => {
        resource.request = resource.request.slice(5);
      }));
      config.resolve.fallback = { ...config.resolve.fallback, module: false, fs: false, path: false, url: false, crypto: false };
    }
    return config;
  },
};

export default config;
