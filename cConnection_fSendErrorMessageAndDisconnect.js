module.exports = cConnection_fSendErrorMessageAndDisconnect;

var cConnection_fSendErrorMessage = require("./cConnection_fSendErrorMessage");

function cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError, uId) {
  cConnection_fSendErrorMessage(oThis, oRPCError, uId, function() {
    oThis.fDisconnect();
  });
}
