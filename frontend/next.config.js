/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled for API routes compatibility
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  reactStrictMode: true, // Enable strict mode for better development experience
  images: {
    unoptimized: false  // Enable image optimization
  },
  productionBrowserSourceMaps: false, // Disable source maps in production to reduce bundle size

  // Enable linting and type checking for production
  eslint: {
    ignoreDuringBuilds: false  // Enable ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: false   // Enable TypeScript error checking during builds
  },

  // Bundle analysis + optimization
  webpack: (config, { dev, isServer }) => {
    // Bundle analyzer (conditionnel)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: './bundle-analyzer-report.html',
        })
      );
    }

    if (dev && !isServer) {
      // Enable filesystem cache in development for better performance
      config.cache = {
        type: 'filesystem',
      };
      // Reduce parallelism to prevent worker issues
      config.parallelism = 1;
    }

    // Optimize bundle splitting and tree shaking
    if (!dev && !isServer) {
      // Enable better code splitting for vendor chunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 20,
            },
            recharts: {
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              name: 'recharts',
              chunks: 'all',
              priority: 20,
            },
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }

    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };

    return config;
  },
  // Headers and redirects disabled for static export compatibility
};

export default nextConfig;
