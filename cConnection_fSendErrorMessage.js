module.exports = cConnection_fSendErrorMessage;

function cConnection_fSendErrorMessage(oThis, oRPCError, uId, fCallback) {
  // Error objects cannot be converted to a string using JSON.stringify. To get around this, a copy of the Error
  // object is created that has the same properties, but which can be converted to a string using JSON.stringify.
  var oErrorDetails = {};
  Object.getOwnPropertyNames(oRPCError).forEach(function (sPropertyName) {
    oErrorDetails[sPropertyName] = oRPCError[sPropertyName];
  });
  var dxMessage = {
    "error": oErrorDetails,
  };
  if (uId !== undefined) {
    dxMessage["id"] = uId;
  } else {
    oThis.emit("error", oRPCError);
  }
  oThis._fSendMessage(dxMessage, fCallback);
};
