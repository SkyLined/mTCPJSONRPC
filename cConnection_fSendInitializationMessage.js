module.exports = function cConnection_fSendInitializationMessage(oThis, sType, sVersion, fCallback) {
  var dxMessage = {
    "initialize": sType,
    "version": sVersion,
  };
  oThis._fSendMessage(dxMessage, function(oError) {
    if (oError) {
      var oRPCError = new cRPCError(mErrorCodes.iConnectionFailed, "Unable to send " + sType + " message", oError);
      oThis.emit("error", oRPCError);
      oThis.fDisconnect();
    }
    if (fCallback) fCallback(oError);
  });
};
