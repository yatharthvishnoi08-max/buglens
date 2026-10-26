import type { NextConfig } from "next";
const config: NextConfig = {
  outputFileTracingIncludes: { "/api/analyze-visual": ["./fixtures/**/*"], "/api/sample-image": ["./fixtures/screenshots/*.png"] },
  poweredByHeader: false,
};
export default config;
