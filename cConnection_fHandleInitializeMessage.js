var mSettings = require("./mSettings"),
    cConnection_fSendErrorMessage = require("./cConnection_fSendErrorMessage"),
    cConnection_fSendErrorMessageAndDisconnect = require("./cConnection_fSendErrorMessageAndDisconnect"),
    cConnection_fSendInitializationMessage = require("./cConnection_fSendInitializationMessage");

module.exports = function cConnection_fHandleInitializeMessage(oThis, dxMessage) {
  if (oThis._bInitialized) {
    var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Unexpected JSON RPC initialize message", dxMessage);
    cConnection_fSendErrorMessage(oThis, oRPCError);
  } else switch (dxMessage["initialize"]) {
    case mSettings.sInitializationVersionRequest:
      if (oThis._bVersionRequested) {
        var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Unexpected JSON RPC version request message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        var bVersionAccepted = dxMessage["version"] == mSettings.sVersion,
            sResponse = bVersionAccepted ? mSettings.sInitializationVersionAccepted
                : mSettings.sInitializationVersionRejected;
        cConnection_fSendInitializationMessage(oThis, sResponse, mSettings.sVersion, function (oError) {
          if (!oError && bVersionAccepted) {
            oThis._bInitialized = true;
            oThis.emit("initialize");
          }
        });
      }
      break;
    case mSettings.sInitializationVersionAccepted:
      if (!oThis._bVersionRequested) {
        var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Unexpected JSON RPC version accept message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else if (dxMessage["version"] != mSettings.sVersion) {
        var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC version accept message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        oThis._bInitialized = true;
        oThis.emit("initialize");
      };
      break;
    case mSettings.sInitializationVersionRejected:
      if (!oThis._bVersionRequested) {
        var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Unexpected JSON RPC version reject message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else if (dxMessage["version"] != mSettings.sVersion) {
        var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC version reject message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Rejected JSON RPC version " + mSettings.sVersion, dxMessage);
        // For backwards compatibility, you may want to accept earlier versions where appropriate.
        oThis.emit("error", oRPCError);
        oThis.fDisconnect();
      };
      break;
    default:
      var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC initialize message", dxMessage);
      cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
  };
};

