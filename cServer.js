module.exports = cServer;

var mEvents = require("events"),
    mOS = require("os"),
    mUtil = require("util"),
    mTCPJSON = require("mTCPJSON"),
    cConnection = require("./cConnection");


function cServer(dxOptions) {
  if (this.constructor != arguments.callee) return new arguments.callee(dxOptions);
  // options: uIPVersion, sHostname, uPort, uConnectionKeepAlive (ms)
  // emits: error, start, connect, stop
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis._uIPVersion = dxOptions.uIPVersion || 4;
  var sHostname = dxOptions.sHostname || mOS.hostname();
  oThis._uPort = dxOptions.uPort || 28876;
  var uConnectionKeepAlive = dxOptions.uConnectionKeepAlive;
  oThis.dfProcedures = dxOptions.dfProcedures || {};
  oThis._oTCPJSONServer = mTCPJSON.cServer({
    "uIPVersion": oThis._uIPVersion,
    "sHostname": sHostname,
    "uPort": oThis._uPort,
    "uConnectionKeepAlive": uConnectionKeepAlive,
  });
  var sId = "RPC@" + oThis._oTCPJSONServer.sId;
  Object.defineProperty(oThis, "sId", {"get": function () { return sId; }});
  var bStarted = false;
  Object.defineProperty(oThis, "bStarted", {"get": function () { return bStarted; }});
  Object.defineProperty(oThis, "bStopped", {"get": function () { return oThis._oTCPJSONServer == null; }});
  oThis._oTCPJSONServer.on("start", function() {
    bStarted = true;
    oThis.emit("start");
  });
  oThis._oTCPJSONServer.on("error", function(oError) {
    oThis.emit("error", oError); // pass-through
  });
  oThis._oTCPJSONServer.on("connect", function(oTCPJSONConnection) {
    // Use the TCP JSON connection to make an RPC connection.
    var dxOptions = {
          "dfProcedures": oThis.dfProcedures,
        },
        oConnection = new cConnection(oTCPJSONConnection, false, dxOptions);
    oThis.emit("connect", oConnection);
  });
  oThis._oTCPJSONServer.on("stop", function() {
    oThis._oTCPJSONServer = null;
    oThis.emit("stop");
  });
};
mUtil.inherits(cServer, mEvents.EventEmitter);

cServer.prototype.toString = function cServer_toString() {
  var oThis = this;
  return oThis.sId;
};

cServer.prototype.fStop = function cServer_fStop(bDisconnect) {
  var oThis = this;
  if (oThis._oTCPJSONServer == null) throw new Error("The server is already stopped");
  oThis._oTCPJSONServer.fStop(bDisconnect);
};

