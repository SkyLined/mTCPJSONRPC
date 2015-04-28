module.exports = cConnection_fHandleMessage;

var cConnection_fHandleInitializeMessage = require ("./cConnection_fHandleInitializeMessage"),
    cConnection_fHandleErrorMessage = require("./cConnection_fHandleErrorMessage"),
    cConnection_fHandleCallMessage = require("./cConnection_fHandleCallMessage"),
    cConnection_fHandleResultMessage = require("./cConnection_fHandleResultMessage"),
    cConnection_fSendErrorMessage = require("./cConnection_fSendErrorMessage"),
    cConnection_fSendErrorMessageAndDisconnect = require("./cConnection_fSendErrorMessageAndDisconnect"),
    cRPCError = require("./cRPCError");

function cConnection_fHandleMessage(oThis, oError, dxMessage) {
  if (oError) {
    oThis.emit("error", oError);
    var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSON, dxErrorCodes.sInvalidJSON,
        foMakeStringifiableError(oError));
    cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
  } else if (typeof(dxMessage) != "object") {
    var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC message", dxMessage);
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
    var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC message", dxMessage);
    cConnection_fSendErrorMessage(oThis, oRPCError);
  };
};
