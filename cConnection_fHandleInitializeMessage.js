module.exports = cConnection_fHandleInitializeMessage;

var cConnection_fSendErrorMessage = require("./cConnection_fSendErrorMessage"),
    cConnection_fSendErrorMessageAndDisconnect = require("./cConnection_fSendErrorMessageAndDisconnect"),
    cConnection_fSendInitializationMessage = require("./cConnection_fSendInitializationMessage"),
    cRPCError = require("./cRPCError"),
    dxSettings = require("./dxSettings");

function cConnection_fHandleInitializeMessage(oThis, dxMessage) {
  if (oThis._bInitialized) {
    var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, dxErrorCodes.sUnexpectedJSONRPCInitialize, dxMessage);
    cConnection_fSendErrorMessage(oThis, oRPCError);
  } else switch (dxMessage["initialize"]) {
    case dxSettings.sInitializationVersionRequest:
      if (oThis._bVersionRequested) {
        var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, dxErrorCodes.sUnexpectedJSONRPCVersionRequest,
            dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        var bVersionAccepted = dxMessage["version"] == dxSettings.sVersion,
            sResponse = bVersionAccepted ? dxSettings.sInitializationVersionAccepted
                : dxSettings.sInitializationVersionRejected;
        cConnection_fSendInitializationMessage(oThis, sResponse, dxSettings.sVersion, function (oError) {
          if (!oError && bVersionAccepted) {
            oThis._bInitialized = true;
            oThis.emit("initialize");
          }
        });
      }
      break;
    case dxSettings.sInitializationVersionAccepted:
      if (!oThis._bVersionRequested) {
        var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, dxErrorCodes.sUnexpectedJSONRPCVersionAccept,
            dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else if (dxMessage["version"] != dxSettings.sVersion) {
        var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, dxErrorCodes.sInvalidJSONRPCVersionAccept,
            dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        oThis._bInitialized = true;
        oThis.emit("initialize");
      };
      break;
    case dxSettings.sInitializationVersionRejected:
      if (!oThis._bVersionRequested) {
        var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, dxErrorCodes.sUnexpectedJSONRPCVersionReject,
            dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else if (dxMessage["version"] != dxSettings.sVersion) {
        var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, dxErrorCodes.sInvalidJSONRPCVersionReject,
            dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, dxErrorCodes.sRejectedJSONRPCVersion, dxMessage);
        // For backwards compatibility, you may want to accept earlier versions where appropriate.
        oThis.emit("error", oRPCError);
        oThis.fDisconnect();
      };
      break;
    default:
      var oRPCError = new cRPCError(dxErrorCodes.iInvalidJSONRPC, dxErrorCodes.sInvalidJSONRPCInitialize, dxMessage);
      cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
  };
};

