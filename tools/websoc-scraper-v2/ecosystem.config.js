module.exports = {
  apps: [
    {
      name: "websoc-scraper-v2",
      script: "tsx --expose-gc index.ts",
      instances: 1,
      autorestart: true,
      restart_delay: 5 * 60 * 1000, // 5 minutes in ms
    },
  ],
};
