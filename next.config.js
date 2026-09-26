/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Bundle the resume with the send-email function so it's always attached.
    outputFileTracingIncludes: {
      "/api/send-email": ["./assets/resume.pdf"],
    },
  },
};
module.exports = nextConfig;
