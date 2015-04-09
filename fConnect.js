module.exports = fConnect;

var cConnection = require("./cConnection"),
    mTCPJSON = require("mTCPJSON");

function fConnect(fCallback, dxOptions) {
  // dxOptions: uIPVersion, sHostname, uPort, uConnectionKeepAlive (ms)
  // callback args: oError, oConnection
  dxOptions = dxOptions || {};
  var uIPVersion = dxOptions.uIPVersion;
  var sHostname = dxOptions.sHostname;
  var uPort = dxOptions.uPort;
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
