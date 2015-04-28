module.exports = cConnection_fHandleErrorMessage;

function cConnection_fHandleErrorMessage(oThis, dxMessage) {
  // Remote is reporting an error in the JSONRPC layer: execute callback if any or emit an Error instance.
  var oError = new Error(dxMessage["error"].message);
  oError.code = dxMessage["error"].code;
  oError.data = dxMessage["error"].data;
  var fCallback = oThis._dfPendingCallbacks[dxMessage["id"]];
  if (fCallback) {
    delete oThis._dfPendingCallbacks[dxMessage["id"]];
    clearTimeout(oThis._dfPendingCallbackTimeouts[dxMessage["id"]]);
    delete oThis._dfPendingCallbackTimeouts[dxMessage["id"]];
    process.nextTick(function () { fCallback(oThis, oError); });
  } else {
    oThis.emit("error", oError);
  };
};
