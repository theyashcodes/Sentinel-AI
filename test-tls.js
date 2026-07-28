const https = require('https');
https.get("https://google.com", (res) => {
  const cert = res.socket.getPeerCertificate();
  console.log(cert);
});
