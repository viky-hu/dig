import libraryConfig from "./packages/config-eslint/library.js";
import nextConfig from "./packages/config-eslint/next.js";

export default [
  {
    ignores: [
      "**/.git/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "data-analysis/**",
    ],
  },
  ...libraryConfig,
  ...nextConfig,
];
