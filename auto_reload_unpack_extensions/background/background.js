var chromep = new ChromePromise();
var sleep = function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

var source;

function init(store) {
  var lastHash = '';
  var watchUrls = store.watchUrls || [];
  var intervalTime = store.intervalTime || 500;
  var errorCount = 0;

  co(function* () {
    yield sleep(intervalTime);

    source = new EventSource(watchUrls[0]);

    source.addEventListener('message', function (event) {
      errorCount = 0;

      var data = event.data;
      var origin = event.origin;
      var lastEventId = event.lastEventId;
      if (lastHash !== data) {
        co(function* () {
          var tabsList = yield chromep.tabs.query({}) || [];
          var lastTab;
          for (var key in tabsList) {
            var theTab = tabsList[key];
            if (theTab.active) {
              lastTab = theTab;
              break;
            }
          }

          var extensionsTab;
          for (var key in tabsList) {
            var theTab = tabsList[key];
            var url = theTab.url;
            if (/chrome:\/\/extensions/.test(url)) {
              extensionsTab = theTab;
              break;
            }
          }
          if (extensionsTab) {
            yield chrome.tabs.reload(extensionsTab.id)
          } else {
            chromep.tabs.create({ url: 'chrome://extensions' });
            chromep.tabs.update(lastTab.id, { selected: true });
          }
        });
        lastHash = data;
      }
    }, false);

    source.addEventListener('error', function (event) {
      console.log(event);
      if (errorCount > 4 || source.readyState === EventSource.CLOSED) {
        stop();
        // 失败次数过多关闭连接
        chrome.storage.sync.set({ enable: 0 }, function () {
        });
      }
      errorCount += 1;
    }, false);
  }).catch(function (err) {
    throw err;
  });
}

function start() {
  if (!source || source.readyState === EventSource.CLOSED) {
    co(function* () {
      // 读取值
      var store = yield chromep.storage.sync.get(['enable', 'intervalTime', 'watchUrls']);
      if (store.enable) {
        init(store);
      }
    }).catch(function (err) {
      throw err;
    });
  }
}

function stop() {
  if (source && source.readyState !== EventSource.CLOSED) {
    source.close();
  }
  source = null;
}

function restart() {
  stop();
  start();
}

co(function* () {
  // 读取值
  var store = yield chromep.storage.sync.get(['enable', 'intervalTime', 'watchUrls']);
  var enable = store.enable;

  if (enable) {
    init(store);
  }

}).catch(function (err) {
  throw err;
});
