var mTCPJSONRPC = require("../mTCPJSONRPC");

var bServerCallFinished = false,
    bClientCallHandled = false,
    dfProcedures = {
      "client call": fHandleClientCall,
    };
new mTCPJSONRPC.fConnect(fConnectCallback, {"dfProcedures": dfProcedures});
function fConnectCallback(oError, oConnection) {
  if (oError) {
    console.log("connection failed, error:" + oError);
  } else {
    console.log("connection established:" + oConnection);
    oConnection.on("error", function (oError) {
      console.log("connection error: " + oError);
    });
    oConnection.on("start", function () {
      oConnection.fCall("server call", "server call argument", fHandleServerCallResult);
    });
    oConnection.on("stop", function () {
      console.log("connection disconnected: " + oConnection);
    });
  };
};

function fHandleClientCall(oConnection, xData, fCallback) {
  console.log("client call argument:", xData);
  fCallback(undefined, "client call result"); // (oError, xResult)
  bClientCallHandled = true;
  if (bServerCallFinished) {
    oConnection.fDisconnect();
  };
};

function fHandleServerCallResult(oConnection, oError, xResult) {
  if (oError) {
    console.log("server call failed:", oError);
  } else {
    console.log("server call returned", xResult);
  };
  bServerCallFinished = true;
  if (bClientCallHandled) {
    oConnection.fDisconnect();
  };
}