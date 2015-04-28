module.exports = cServer;

var cConnection = require("./cConnection"),
    mEvents = require("events"),
    mTCPJSON = require("mTCPJSON"),
    mUtil = require("util");

function cServer(dxOptions) {
  if (this.constructor != arguments.callee) throw new Error("This is a constructor, not a function");
  // options: uIPVersion, sHostname, uPort, uConnectionKeepAlive (ms), dfProcedures
  // emits: error, start, connect, stop
  var oThis = this;
  dxOptions = dxOptions || {};
  oThis._uIPVersion = dxOptions.uIPVersion;
  var sHostname = dxOptions.sHostname;
  oThis._uPort = dxOptions.uPort;
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
  oThis._oTCPJSONServer && oThis._oTCPJSONServer.fStop(bDisconnect);
};

