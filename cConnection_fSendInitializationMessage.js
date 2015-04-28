module.exports = cConnection_fSendInitializationMessage;

var cRPCError = require("./cRPCError");

function cConnection_fSendInitializationMessage(oThis, sType, sVersion, fCallback) {
  var dxMessage = {
    "initialize": sType,
    "version": sVersion,
  };
  oThis._fSendMessage(dxMessage, function(oError) {
    if (oError) {
      var oRPCError = new cRPCError(dxErrorCodes.iConnectionFailed, dxErrorCodes.sConnectionFailed, oError);
      oThis.emit("error", oRPCError);
      oThis.fDisconnect();
    }
    if (fCallback) fCallback(oError);
  });
};
