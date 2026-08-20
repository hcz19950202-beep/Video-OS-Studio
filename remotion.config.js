/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const {Config} = require("@remotion/cli/config");

Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: {
      ...(typeof current.resolve?.alias === "object" ? current.resolve.alias : {}),
      "@": path.resolve(process.cwd()),
    },
  },
}));
