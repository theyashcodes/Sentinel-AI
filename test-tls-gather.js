/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https');
const evidence = { tls: null, redirects: [] };
function fetch(url, hopCount=0) {
  return new Promise((resolve) => {
    evidence.tls = null;
    const req = https.get(url, (res) => {
      console.log(`Hop ${hopCount}: ${url} -> ${res.statusCode}`);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetch(res.headers.location, hopCount + 1));
      }
      resolve();
    });
    req.on('socket', (socket) => {
      console.log(`Hop ${hopCount}: socket event fired`);
      socket.on('secureConnect', () => {
         const cert = socket.getPeerCertificate();
         console.log(`Hop ${hopCount}: secureConnect event fired. Subject: ${cert ? cert.subject.CN : 'NONE'}`);
         if (cert && cert.subject) {
           evidence.tls = cert.subject;
         }
      });
    });
  });
}
fetch("https://google.com").then(() => console.log("Final Evidence:", evidence));
