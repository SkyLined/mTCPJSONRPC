module.exports = cConnection;

var mDomain = require("domain"),
    mEvents = require("events"),
    oErrorCodes = require("./oErrorCodes"),
    mUtil = require("util");

// Communcation is base on JSON-RPC 2.0, but allows "full-duplex" RPC: both ends of a connection can make requests,
// return results and report errors. To achieve this, a few changes have been made:
// A request object looks like this:
//   {"jsonrpc": "3.0", "call": <string> [, "data": <any>] [, "id": <int or string>]}
// Where:
//   - "call" contains the name of the procedure to be called. This is similar to the "method" field of JSON-RPC v2.0,
//            but there are no reserved words.
//   - "data" contains data to be passed to the procedure. This is similar to the "params" field of JSON-RPC 2.0, but
//            it can have any value.
//   - "id" the same as in JSON-RPC 2.0, but the value must not be a floating-point number and must not have been used
//            in a previous request.
// When a request is received, the function associated with the value in the "call" field should be executed and the
// value inthe "data" field should be passed as a parameter. If an "id" field is provided, exactly one result or error
// object must be sent back with the same value in its "id" field.
// A result object looks like this:
//   {"jsonrpc": "3.0", "result": {["error": <undefined or object>] [, "data": <any>]}, "id": <uint>}
// Where:
//   - "result" is an object containing an "error" and/or a "data" field.
//   - "error" is undefined or an error that occured while executing the procedure.
//   - "data" is undefined or whatever data is the result of performing the procedure.
//   - "id" the value of the "id" field of the associated request object.
// If both "error" and "data" are provided, at least one of these two must have the value <undefined>.
// Note that if an error occurs while executing the procedure for which a callback is expected, a "result" object
// should be send back and not an "error" object. The later is used for errors in the JSON-RPC layer. 
// Whenever an error in the JSON-RPC layer occurs, an error object must be send to the remote end:
//   {"jsonrpc": "3.0", "error": <object> [, "id": <uint>]}
// Where:
//   - "error" is an error that represents the issue.
//   - "id" the value of the "id" field of the associated request object.
var sVersion = "0.1",
    sInitializationVersionRequest = "TCP JSON RPC version request",
    sInitializationVersionAccepted = "TCP JSON RPC version accepted",
    sInitializationVersionRejected = "TCP JSON RPC version rejected";

// Error objects cannot be converted to a string using JSON.stringify. To get around this, a copy of the Error
// object is created that has the same properties, but which can be converted to a string using JSON.stringify.
function foMakeStringifiableError(oError) {
  var oStringifiableError = {};
  Object.getOwnPropertyNames(oError).forEach(function (sPropertyName) {
    oStringifiableError[sPropertyName] = oError[sPropertyName];
  });
  return oStringifiableError;
};
function cRPCError(iCode, sMessage, xData) {
  var oThis = this;
  Error.call(oThis);
  oThis.message = sMessage;
  oThis.code = iCode;
  if (xData !== undefined) oThis.data = xData;
};
cRPCError.prototype.__proto__ = Error.prototype;
cRPCError.prototype.name = 'RPCError';
cRPCError.prototype.toString = function cRPCError_toString() {
  var oThis = this;
  var sDataMessage = ("data" in oThis ? ", data: " + JSON.stringify(oThis.data) : "");
  return "RPCError(" + oThis.code + ": " + oThis.message + sDataMessage + ")";
};
function cConnection(oTCPJSONConnection, bRequestVersion, dxOptions) {
  if (this.constructor != arguments.callee) return new arguments.callee(dfProcedures, oTCPJSONConnection);
  // events: error, initialize, disconnect
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis.dfProcedures = dxOptions.dfProcedures || {};
  oThis._uResultTimeout = dxOptions.uResultTimeout || 10000; // default 10 seconds
  oThis._oTCPJSONConnection = oTCPJSONConnection;
  oThis._uCallbackIdCounter = 0;
  oThis._dfPendingCallbacks = {};
  oThis._dfPendingCallbackTimeouts = {};
  oThis._bVersionRequested = bRequestVersion;
  oThis._oTCPJSONConnection.on("error", function (oError) {
    oThis.emit("error", oError);
  });
  oThis._oTCPJSONConnection.on("disconnect", function () {
    var oError = new Error("Connection closed");
    oError.code = oErrorCodes.iConnectionFailed;
    for (var uId in oThis._dfPendingCallbacks) {
      var fCallback = oThis._dfPendingCallbacks[uId];
      clearTimeout(oThis._dfPendingCallbackTimeouts[uId]);
      delete oThis._dfPendingCallbackTimeouts[uId];
      delete oThis._dfPendingCallbacks[uId];
      process.nextTick(function () { fCallback(oThis, oError); });
    };
    oThis.emit("disconnect");
  });
  oThis._oTCPJSONConnection.on("message", function (oError, xMessage) {
    cConnection_fHandleMessage(oThis, oError, xMessage);
  });
  if (bRequestVersion) {
    cConnection_fSendInitializationMessage(oThis, sInitializationVersionRequest, sVersion);
  }
};
mUtil.inherits(cConnection, mEvents.EventEmitter);

cConnection.prototype.toString = function cConnection_toString() {
  var oThis = this;
  return "RPC" + sVersion + "@" + oThis._oTCPJSONConnection.toString();
};
cConnection.prototype.fCall = function cConnection_fNotify(sProcedure, xParameters, fResultCallback) {
  var oThis = this;
  if (!oThis._bInitialized) throw new Error("Cannot call remote procedure before connection is initialized");
  cConnection_fSendCallMessage(oThis, sProcedure, xParameters, fResultCallback);
};
cConnection.prototype.fDisconnect = function cConnection_fDisconnect() {
  var oThis = this;
  oThis._oTCPJSONConnection.fDisconnect();
};
function cConnection_fSendInitializationMessage(oThis, sType, sVersion) {
  var dxMessage = {
    "initialize": sType,
    "version": sVersion,
  };
  cConnection_fSendMessage(oThis, dxMessage, function(oError) {
    if (oError) {
      var oRPCError = new cRPCError(oErrorCodes.iConnectionFailed, "Unable to send " + sType + " message", oError);
      oThis.emit("error", oRPCError);
      oThis.fDisconnect();
    }
  });
};
function cConnection_fSendCallMessage(oThis, sProcedure, xData, fResultCallback) {
  var dxMessage = {
    "call": sProcedure,
    "data": xData,
  };
  var uId;
  if (fResultCallback) {
    uId = oThis._uCallbackIdCounter++;
    dxMessage["id"] = uId;
  };
  cConnection_fSendMessage(oThis, dxMessage, function(oError) {
    if (fResultCallback) {
      if (oError) { // Cannot send message, call callback with error
        var oRPCError = new cRPCError(oErrorCodes.iConnectionFailed, "Unable to send call message", oError);
        process.nextTick(function () {
          fResultCallback(oThis, oRPCError);
        });
      } else {
        oThis._dfPendingCallbacks[uId] = fResultCallback;
        oThis._dfPendingCallbackTimeouts[uId] = setTimeout(function () {
          delete oThis._dfPendingCallbacks[uId];
          delete oThis._dfPendingCallbackTimeouts[uId];
          var oRPCError = new cRPCError(oErrorCodes.iResultTimeout, "Result timeout", 
              "Result was not received within " + (oThis._uResultTimeout / 1000) + " seconds");
          cConnection_fSendErrorMessage(oThis, oRPCError, uId);
          process.nextTick(function () {
            fResultCallback(oThis, oRPCError);
          });
        }, oThis._uResultTimeout);
      };
    };
  });
};
function cConnection_fSendResultMessage(oThis, oError, xResultData, uId) {
  cConnection_fSendMessage(oThis, {
    "result": {
      "error": oError,
      "data": xResultData,
    },
    "id": uId,
  });
};
function cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError, uId) {
  cConnection_fSendErrorMessage(oThis, oRPCError, uId, function() {
    oThis.fDisconnect();
  });
}
function cConnection_fSendErrorMessage(oThis, oRPCError, uId, fCallback) {
  var dxMessage = {
    "error": foMakeStringifiableError(oRPCError),
  };
  if (uId !== undefined) {
    dxMessage["id"] = uId;
  } else {
    oThis.emit("error", oRPCError);
  }
  cConnection_fSendMessage(oThis, dxMessage, fCallback);
};
function cConnection_fSendMessage(oThis, dxMessage, fCallback) {
  oThis._oTCPJSONConnection.fSendMessage(dxMessage, function(oError) {
    if (fCallback) fCallback(oError);
  });
};
function cConnection_fHandleMessage(oThis, oError, dxMessage) {
  if (oError) {
    oThis.emit("error", oError);
    var oRPCError = new cRPCError(oErrorCodes.iInvalidJSON, "JSON parse error", foMakeStringifiableError(oError));
    cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
  } else if (typeof(dxMessage) != "object") {
    var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC message", dxMessage);
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
    var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC message", dxMessage);
    cConnection_fSendErrorMessage(oThis, oRPCError);
  };
};
function cConnection_fHandleInitializeMessage(oThis, dxMessage) {
  if (oThis._bInitialized) {
    var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Unexpected JSON RPC initialize message", dxMessage);
    cConnection_fSendErrorMessage(oThis, oRPCError);
  } else switch (dxMessage["initialize"]) {
    case sInitializationVersionRequest:
      if (oThis._bVersionRequested) {
        var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Unexpected JSON RPC version request message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        var sResponse = dxMessage["version"] == sVersion ? sInitializationVersionAccepted : sInitializationVersionRejected;
        cConnection_fSendInitializationMessage(oThis, sResponse, sVersion);
      }
      break;
    case sInitializationVersionAccepted:
      if (!oThis._bVersionRequested) {
        var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Unexpected JSON RPC version accept message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else if (dxMessage["version"] != sVersion) {
        var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC version accept message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        oThis._bInitialized = true;
        oThis.emit("initialize");
      };
      break;
    case sInitializationVersionRejected:
      if (!oThis._bVersionRequested) {
        var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Unexpected JSON RPC version reject message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else if (dxMessage["version"] != sVersion) {
        var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC version reject message", dxMessage);
        cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
      } else {
        var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Rejected JSON RPC version " + sVersion, dxMessage);
        // For backwards compatibility, you may want to accept earlier versions where appropriate.
        oThis.emit("error", oRPCError);
        oThis.fDisconnect();
      };
      break;
    default:
      var oRPCError = new cRPCError(oErrorCodes.iInvalidJSONRPC, "Invalid JSON RPC initialize message", dxMessage);
      cConnection_fSendErrorMessageAndDisconnect(oThis, oRPCError);
  };
};
function cConnection_fHandleErrorMessage(oThis, dxMessage) {
  // Remote is reporting an error in the JSONRPC layer: execute callback if any or emit an Error instance.
  var oError = new Error(dxMessage["error"].message);
  oError.code = dxMessage["error"].code;
  oError.data = dxMessage["error"].data;
  var fCallback = oThis._dfPendingCallbacks[dxMessage["id"]];
  if (fCallback) {
    delete oThis._dfPendingCallbacks[dxMessage["id"]];
    clearTimeout(oThis._dfPendingCallbackTimeouts[dxMessage["id"]]);
    delete oThis._dfPendingCallbackTimeouts[dxMessage["id"]];
    process.nextTick(function () { fCallback(oThis, oError); });
  } else {
    oThis.emit("error", oError);
  };
};
function cConnection_fHandleCallMessage(oThis, dxMessage) {
  // Remote is requesting a procedure call, execute if exist or report and error.
  var fProcedure = oThis.dfProcedures[dxMessage["call"]];
  if (!fProcedure) {
    var oRPCError = new cRPCError(oErrorCodes.iProcedureNotFound, "Procedure not found.", dxMessage["call"]);
    cConnection_fSendErrorMessage(oThis, oRPCError, dxMessage["id"]);
  } else {
    var bResponseSent = false,
        oDomain = mDomain.create();
    oDomain.on("error", function (oError) {
      if (dxMessage["id"] !== undefined && !bResponseSent) {
        bResponseSent = true;
        var oRPCError = new cRPCError(oErrorCodes.iProcedureFailed, "Unhandled exception", foMakeStringifiableError(oError));
        cConnection_fSendErrorMessage(oThis, oRPCError, dxMessage["id"]);
      };
      throw oError;
    });
    oDomain.run(function() {
      process.nextTick(function () { // Clear the stack in case of an error
        fProcedure(oThis, dxMessage["data"], function (oError, xResultData) {
          if (dxMessage["id"] !== undefined && !bResponseSent) {
            bResponseSent = true;
            cConnection_fSendResultMessage(oThis, oError, xResultData, dxMessage["id"]);
          };
        });
      });
    });
  };
};
function cConnection_fHandleResultMessage(oThis, dxMessage) {
  var fCallback = oThis._dfPendingCallbacks[dxMessage["id"]];
  if (!fCallback) {
    var oRPCError = new cRPCError(oErrorCodes.iInvalidId, "Invalid result id", dxMessage["id"]);
    cConnection_fSendErrorMessage(oThis, oRPCError);
  } else {
    delete oThis._dfPendingCallbacks[dxMessage["id"]];
    clearTimeout(oThis._dfPendingCallbackTimeouts[dxMessage["id"]]);
    delete oThis._dfPendingCallbackTimeouts[dxMessage["id"]];
    fCallback(oThis, dxMessage["result"]["error"], dxMessage["result"]["data"]);
  };
};
