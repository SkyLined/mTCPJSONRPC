var cConnection_fSendErrorMessage = require("./cConnection_fSendErrorMessage");

module.exports = function cConnection_fHandleResultMessage(oThis, dxMessage) {
  var fCallback = oThis._dfPendingCallbacks[dxMessage["id"]];
  if (!fCallback) {
    var oRPCError = new cRPCError(mErrorCodes.iInvalidId, "Invalid result id", dxMessage["id"]);
    cConnection_fSendErrorMessage(oThis, oRPCError);
  } else {
    delete oThis._dfPendingCallbacks[dxMessage["id"]];
    clearTimeout(oThis._dfPendingCallbackTimeouts[dxMessage["id"]]);
    delete oThis._dfPendingCallbackTimeouts[dxMessage["id"]];
    fCallback(oThis, dxMessage["result"]["error"], dxMessage["result"]["data"]);
  };
};
