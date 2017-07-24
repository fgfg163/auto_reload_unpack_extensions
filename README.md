## Auto Reload Unpack Extensions

This tool need a HTML5 sse api to receive message from server. When server psuh a different string or hash, this tool will reload chrome://extension, then extension will be reload.

You can click action icon and start watching, or set url of server. Tool will pause during popup page open;

Tool will retry 5 times when network error. When tool stoped, you can start it on popup page again.

Server code example:
```
const http = require('http');
const webpack = require('webpack');

const configObject = require('./webpack.config.js')();
// params
const thePort = 8089;
const ssePath = '/sse';
const httpPath = '/http';
// base lib
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// start
let lastHash = '';
let ssePushArray = [];

configObject.watch = true;
const compiler = webpack(configObject);

console.log('watting...');
const watching = compiler.watch({
  poll: true
}, (err, stats) => {
  console.log(stats.toString({
    chunks: false,
    colors: true
  }));
  console.log('------------------------------------------------------');
  lastHash = stats.hash;
  // when webpack compiled, push message to all client
  for (var key in ssePushArray) {
    var res = ssePushArray[key];
    res.write('data: ' + lastHash + '\n\n');
  }
});


// important
http.createServer(function (req, res) {
  var theUrl = req.url || '';
  if (theUrl.match(ssePath)) {
    // header
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('retry: 10000\n');
    res.write('event: connecttime\n');
    res.write('data: ' + lastHash + '\n\n');

    ssePushArray.push(res);

    req.connection.addListener('close', function () {
      for (var i = 0; i < ssePushArray.length; i++) {
        if (ssePushArray[i] === req) {
          ssePushArray.splice(i, 1);
          break;
        }
      }
    }, false);
  } else if (theUrl.match(httpPath)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(lastHash);
  }
}).listen(thePort, '127.0.0.1');


```
