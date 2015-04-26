module.exports = function cConnection_fSendErrorMessage(oThis, oRPCError, uId, fCallback) {
  var oStringifiableError = {};
  Object.getOwnPropertyNames(oRPCError).forEach(function (sPropertyName) {
    oStringifiableError[sPropertyName] = oRPCError[sPropertyName];
  });
  var dxMessage = {
    "error": oStringifiableError,
  };
  if (uId !== undefined) {
    dxMessage["id"] = uId;
  } else {
    oThis.emit("error", oRPCError);
  }
  oThis._fSendMessage(dxMessage, fCallback);
};
