var mDomain = require("domain"),
    cConnection_fSendErrorMessage = require("./cConnection_fSendErrorMessage");

module.exports = function cConnection_fHandleCallMessage(oThis, dxMessage) {
  // Remote is requesting a procedure call, execute if exist or report and error.
  var fProcedure = oThis.dfProcedures[dxMessage["call"]];
  if (!fProcedure) {
    var oRPCError = new cRPCError(mErrorCodes.iProcedureNotFound, "Procedure not found.", dxMessage["call"]);
    cConnection_fSendErrorMessage(oThis, oRPCError, dxMessage["id"]);
  } else {
    var bResponseSent = false,
        oDomain = mDomain.create();
    oDomain.on("error", function (oError) {
      if (dxMessage["id"] !== undefined && !bResponseSent) {
        bResponseSent = true;
        var oRPCError = new cRPCError(mErrorCodes.iProcedureFailed, "Unhandled exception", foMakeStringifiableError(oError));
        cConnection_fSendErrorMessage(oThis, oRPCError, dxMessage["id"]);
      };
      throw oError;
    });
    oDomain.run(function() {
      process.nextTick(function () { // Clear the stack in case of an error
        fProcedure(oThis, dxMessage["data"], function (oError, xResultData) {
          if (dxMessage["id"] !== undefined && !bResponseSent) {
            bResponseSent = true;
            oThis._fSendMessage({
              "result": {
                "error": oError,
                "data": xResultData,
              },
              "id": dxMessage["id"],
            });
          };
        });
      });
    });
  };
};
