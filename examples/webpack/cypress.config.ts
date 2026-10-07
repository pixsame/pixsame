import { defineConfig } from "cypress";
import { initPlugin } from "@pixsame/cypress-plugin-visual-regression-diff/plugins";
import { VueLoaderPlugin } from "vue-loader";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
  },

  component: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
    devServer: {
      framework: "vue",
      bundler: "webpack",
      webpackConfig: {
        plugins: [new VueLoaderPlugin()],
        module: {
          rules: [
            { test: /\.vue$/, loader: "vue-loader" },
            { test: /\.css$/, use: ["vue-style-loader", "css-loader"] },
            { test: /\.(png|jpg|gif|svg)$/, type: "asset/resource" },
          ],
        },
      },
    },
  },
});
