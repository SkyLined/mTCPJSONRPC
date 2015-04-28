module.exports = cConnection;

var cConnection_fHandleMessage = require("./cConnection_fHandleMessage"),
    cConnection_fSendCallMessage = require("./cConnection_fSendCallMessage"),
    cConnection_fSendInitializationMessage = require("./cConnection_fSendInitializationMessage"),
    dxErrorCodes = require("./dxErrorCodes"),
    mEvents = require("events"),
    dxSettings = require("./dxSettings"),
    mUtil = require("util");

function cConnection(oTCPJSONConnection, bRequestVersion, dxOptions) {
  if (this.constructor != arguments.callee) throw new Error("This is a constructor, not a function");
  // events: error, initialize, disconnect
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis.dfProcedures = dxOptions.dfProcedures || {};
  oThis._uResultTimeout = dxOptions.uResultTimeout || dxSettings.uResultTimeout; // default 10 seconds
  var sId = "RPC" + dxSettings.sVersion + "@" + oTCPJSONConnection.toString();
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
    oError.code = dxErrorCodes.iConnectionFailed;
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
    cConnection_fSendInitializationMessage(oThis, dxSettings.sInitializationVersionRequest, dxSettings.sVersion);
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
