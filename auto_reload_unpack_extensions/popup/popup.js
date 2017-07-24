var chromep = new ChromePromise();

var backgroundPage = chrome.extension.getBackgroundPage();

backgroundPage.stop();

co(function* () {
  var createNewInputWatchUrl = function (param) {
    param = param || {};
    var div = document.createElement('div');
    var input = document.createElement('input');
    input.setAttribute('class', 'watch-url');
    for (var key in param) {
      var value = param[key];
      input.setAttribute(key, value);
    }
    div.appendChild(input);
    return div;
  }

  var debounce = (function (func, ms) {
    var tid;
    return function () {
      var args = Array.prototype.slice.call(arguments);
      tid && clearTimeout(tid);
      tid = setTimeout(function () {
        func.apply(this, args);
      }, ms);
    };
  });

  // 读取值
  var store = yield chromep.storage.sync.get(['enable', 'intervalTime', 'watchUrls']);
  var enable = store.enable;
  var watchUrls = store.watchUrls || [];
  var intervalTime = store.intervalTime || 500;


  if (enable) {
    $('input:radio[name=enable][value="1"]').attr('checked', true);
  } else {
    $('input:radio[name=enable][value="0"]').attr('checked', true);
  }

  $('[name=interval-time]').val(intervalTime);

  if (watchUrls.length === 0) {
    watchUrls = [''];
  }
  for (var key in watchUrls) {
    var value = watchUrls[key];
    $('.watch-url-border').append(createNewInputWatchUrl({ value: value }));
  }

  // 注册事件
  $('input:radio[name=enable]').change(function (event) {
    var value = parseInt(event.target.value);
    chrome.storage.sync.set({ enable: value }, function () {
    });
  });

  var saveIntervalTimeToStorage = debounce(function (event) {
    var value = event.target.value || 500;
    chrome.storage.sync.set({ intervalTime: value }, function () {
    });
  }, 200);
  $('[name=interval-time]').on('input', saveIntervalTimeToStorage);

  var saveUrlToStorage = debounce(function () {
    var urlList = $('.watch-url');
    var resultList = [];
    for (var key = 0; key < urlList.length; key++) {
      var theInput = urlList[key];
      if (theInput.value) {
        resultList.push(theInput.value);
      }
    }
    chrome.storage.sync.set({ watchUrls: resultList }, function () {
    });
  }, 200);

  $('.watch-url-border').on('input', '.watch-url', saveUrlToStorage);

  $('.add-button').click(function (event) {
    $('.watch-url-border').append(createNewInputWatchUrl());
  });

  addEventListener('unload', function (event) {
    backgroundPage.start();
  }, true);

}).catch(function (err) {
  throw err;
});
