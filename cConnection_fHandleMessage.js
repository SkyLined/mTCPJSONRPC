var cConnection_fHandleInitializeMessage = require ("./cConnection_fHandleInitializeMessage"),
    cConnection_fHandleErrorMessage = require("./cConnection_fHandleErrorMessage"),
    cConnection_fHandleCallMessage = require("./cConnection_fHandleCallMessage"),
    cConnection_fHandleResultMessage = require("./cConnection_fHandleResultMessage"),
    cConnection_fSendErrorMessage = require("./cConnection_fSendErrorMessage"),
    cConnection_fSendErrorMessageAndDisconnect = require("./cConnection_fSendErrorMessageAndDisconnect");

module.exports = function cConnection_fHandleMessage(oThis, oError, dxMessage) {
  if (oError) {
    oThis.emit("error", oError);
    var oRPCError = new cRPCError(mErrorCodes.iInvalidJSON, "JSON parse error", foMakeStringifiableError(oError));
    cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
  } else if (typeof(dxMessage) != "object") {
    var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC message", dxMessage);
    cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
  } else if ("initialize" in dxMessage) {
    cConnection_fHandleInitializeMessage(oThis, dxMessage);
  } else if ("error" in dxMessage) {
    cConnection_fHandleErrorMessage(oThis, dxMessage);
  } else if ("call" in dxMessage) {
    cConnection_fHandleCallMessage(oThis, dxMessage);
  } else if ("result" in dxMessage) {
    cConnection_fHandleResultMessage(oThis, dxMessage);
  } else {
    var oRPCError = new cRPCError(mErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC message", dxMessage);
    cConnection_fSendErrorMessage(oThis, oRPCError);
  };
};
