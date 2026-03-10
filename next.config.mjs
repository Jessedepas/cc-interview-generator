import path from "path";
import { fileURLToPath } from "url";
import CopyPlugin from "copy-webpack-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/generate-profile": ["./public/logo.png"],
      "/api/generate-scorecard-pdf": ["./public/logo.png"],
      "/api/generate-summary-pdf": ["./public/logo.png"],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(
                __dirname,
                "node_modules/pdfkit/js/data"
              ),
              to: path.join(__dirname, ".next/server/vendor-chunks/data"),
            },
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;
