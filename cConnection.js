module.exports = cConnection;

var cConnection_fHandleMessage = require("./cConnection_fHandleMessage"),
    cConnection_fSendCallMessage = require("./cConnection_fSendCallMessage"),
    cConnection_fSendInitializationMessage = require("./cConnection_fSendInitializationMessage"),
    mErrorCodes = require("./mErrorCodes"),
    mEvents = require("events"),
    mSettings = require("./mSettings"),
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

// Error objects cannot be converted to a string using JSON.stringify. To get around this, a copy of the Error
// object is created that has the same properties, but which can be converted to a string using JSON.stringify.
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
  oThis._uResultTimeout = dxOptions.uResultTimeout || mSettings.uResultTimeout; // default 10 seconds
  var sId = "RPC" + mSettings.sVersion + "@" + oTCPJSONConnection.toString();
  Object.defineProperty(oThis, "sId", {"get": function () { return sId; }});
  oThis._oTCPJSONConnection = oTCPJSONConnection;
  Object.defineProperty(oThis, "bConnected", {"get": function () { return oThis._oTCPJSONConnection != null; }});
  oThis._uCallbackIdCounter = 0;
  oThis._dfPendingCallbacks = {};
  oThis._dfPendingCallbackTimeouts = {};
  oThis._bVersionRequested = bRequestVersion;
  oThis._oTCPJSONConnection.on("error", function (oError) {
    oThis.emit("error", oError);
  });
  oThis._oTCPJSONConnection.on("disconnect", function () {
    oThis._oTCPJSONConnection = null;
    var oError = new Error("Connection closed");
    oError.code = mErrorCodes.iConnectionFailed;
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
    cConnection_fSendInitializationMessage(oThis, mSettings.sInitializationVersionRequest, mSettings.sVersion);
  };
};
mUtil.inherits(cConnection, mEvents.EventEmitter);

cConnection.prototype.toString = function cConnection_toString() {
  var oThis = this;
  return oThis.sId;
};
cConnection.prototype.fCall = function cConnection_fCall(sProcedure, xParameters, fResultCallback) {
  var oThis = this;
  if (!oThis._bInitialized) throw new Error("Cannot call remote procedure before connection is initialized");
  cConnection_fSendCallMessage(oThis, sProcedure, xParameters, fResultCallback);
};
cConnection.prototype.fDisconnect = function cConnection_fDisconnect() {
  var oThis = this;
  oThis._oTCPJSONConnection && oThis._oTCPJSONConnection.fDisconnect();
};
cConnection.prototype._fSendMessage = function cConnection_fSendMessage(dxMessage, fCallback) {
  var oThis = this;
  oThis._oTCPJSONConnection.fSendMessage(dxMessage, function(oError) {
    if (fCallback) fCallback(oError);
  });
};
