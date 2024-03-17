module.exports = {
  apps : [{
    name   : "trustguardian",
    script : "./server.js",
    "ignore_watch": ["~/.pm2/logs"]
  }]
}
