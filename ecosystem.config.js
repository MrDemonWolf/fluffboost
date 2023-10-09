module.exports = {
  apps: [
    {
      name: "fluffboost-discord-bot",
      script: "./dist/app.js",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
