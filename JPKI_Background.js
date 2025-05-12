var portDict = {};

chrome.runtime.onMessage.addListener(
   function(request, sender, sendResponse) {
      if (request.type == "launch") {
         postToNativeHost(sender.tab.id, request.message, sendResponse);
      } else if (request.type == "close") {
         closeApp(sender.tab.id, request.message, sendResponse);
      }
      return true;
   }
);

function postToNativeHost(tabId, msg, callback) {
   var resultMessage = null;
   var nativeMessagingHost = "jp.go.jpki";
   port = chrome.runtime.connectNative(nativeMessagingHost);
   
   port.onDisconnect.addListener(() => {
      portDict[tabId] = null;
      if(resultMessage == null) {
         callback(null);
      }
   });
   
   port.onMessage.addListener(message => {
      resultMessage = message;
      callback(message);
   });
   
   portDict[tabId] = port;
   try {
      port.postMessage(JSON.parse(msg));
   } catch(e) {
      portDict[tabId] = null;
      callback(null);
   }
   
}

function closeApp(tabId, msg, callback) {
   var port = portDict[tabId];
   if (port != null) {
      port.postMessage({ mode: msg });
      var ua = window.navigator.userAgent;
      setTimeout(() => {
         port.disconnect();
         portDict[tabId] = null;
      }, 0);
   }
}