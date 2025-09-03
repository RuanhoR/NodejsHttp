const {
  server
} = require("./lib/http")
const {
  _log
} = require("./lib/tool.js")
const PORT = 1820;
const url = function() {
  const interfaces = require('os').networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}()
server.listen(PORT, '0.0.0.0', async () => {
  _log(`web Page runing on http://${url}:${PORT}`);
});