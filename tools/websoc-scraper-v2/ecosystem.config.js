module.exports = {
  apps: [
    {
      name: "websoc-scraper-v2",
      script: "tsx index.ts",
      instances: 1,
      restart_delay: 5 * 60 * 1000,
    },
  ],
};
