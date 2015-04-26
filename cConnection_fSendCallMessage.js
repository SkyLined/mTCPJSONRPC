var cConnection_fSendErrorMessage = require("./cConnection_fSendErrorMessage");

module.exports = function cConnection_fSendCallMessage(oThis, sProcedure, xData, fResultCallback) {
  var dxMessage = {
    "call": sProcedure,
    "data": xData,
  };
  var uId;
  if (fResultCallback) {
    uId = oThis._uCallbackIdCounter++;
    dxMessage["id"] = uId;
  };
  oThis._fSendMessage(dxMessage, function(oError) {
    if (fResultCallback) {
      if (oError) { // Cannot send message, call callback with error
        var oRPCError = new cRPCError(mErrorCodes.iConnectionFailed, "Unable to send call message", oError);
        process.nextTick(function () {
          fResultCallback(oThis, oRPCError);
        });
      } else {
        oThis._dfPendingCallbacks[uId] = fResultCallback;
        oThis._dfPendingCallbackTimeouts[uId] = setTimeout(function () {
          delete oThis._dfPendingCallbacks[uId];
          delete oThis._dfPendingCallbackTimeouts[uId];
          var oRPCError = new cRPCError(mErrorCodes.iResultTimeout, "Result timeout", 
              "Result was not received within " + (oThis._uResultTimeout / 1000) + " seconds");
          cConnection_fSendErrorMessage(oThis, oRPCError, uId);
          process.nextTick(function () {
            fResultCallback(oThis, oRPCError);
          });
        }, oThis._uResultTimeout);
      };
    };
  });
};
