import { defineConfig } from "cypress";
import { initPlugin } from "@pixsame/cypress-plugin-visual-regression-diff/plugins";

export default defineConfig({
  env: {
    pluginVisualRegressionBatchReviewMode: true,
  },
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
    baseUrl: "http://localhost:3000",
  },
  component: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
});
