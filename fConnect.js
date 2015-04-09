module.exports = fConnect;

var mNet = require("net"),
    mOS = require("os"),
    mTCPJSON = require("mTCPJSON"),
    cConnection = require("./cConnection");

function fConnect(fCallback, dxOptions) {
  // dxOptions: uIPVersion, sHostname, uPort, uConnectionKeepAlive (ms)
  // callback args: oError, oConnection
  dxOptions = dxOptions || {};
  var uIPVersion = dxOptions.uIPVersion || 4;
  var sHostname = dxOptions.sHostname || mOS.hostname();
  var uPort = dxOptions.uPort || 28876;
  var uConnectionKeepAlive = dxOptions.uConnectionKeepAlive;
  var dfProcedures = dxOptions.dfProcedures || {};
  mTCPJSON.fConnect(function (oError, oTCPJSONConnection) {
    var dxOptions = {
          "dfProcedures": dfProcedures,
        },
        oConnection = oError ? undefined : new cConnection(oTCPJSONConnection, true, dxOptions);
    process.nextTick(function () {
      fCallback(oError, oConnection);
    });
  }, {
    "uIPVersion": uIPVersion,
    "sHostname": sHostname,
    "uPort": uPort,
    "uConnectionKeepAlive": uConnectionKeepAlive,
  });
};
