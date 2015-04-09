var mTCPJSONRPC = require("../mTCPJSONRPC");

var bClientCallFinished = false,
    bServerCallHandled = false,
    dfProcedures = {
      "server call": fHandleServerCall,
    },
    oServer = new mTCPJSONRPC.cServer({"dfProcedures": dfProcedures});
oServer.on("error", function (oError) {
  console.log("server error: " + oError);
});
oServer.on("connect", function (oConnection) {
  console.log("connection established:" + oConnection);
  oConnection.on("error", function (oError) {
    console.log("connection error: " + oError);
  });
  oConnection.on("start", function () {
    console.log("connection started:" + oConnection);
    oConnection.fCall("client call", "client call argument", fHandleClientCallResult);
  });
  oConnection.on("stop", function () {
    console.log("connection disconnected: " + oConnection);
  });
});
oServer.on("start", function (oConnection) {
  console.log("server started");
});
oServer.on("stop", function (oConnection) {
  console.log("server stopped");
});
function fHandleServerCall(oConnection, xData, fCallback) {
  console.log("server call received, argument:", xData);
  fCallback(undefined, "server call result"); // (oError, xResult)
  bServerCallHandled = true;
  if (bClientCallFinished) {
    oServer.fStop();
  };
};


function fHandleClientCallResult(oConnection, oError, xResult) {
  if (oError) {
    console.log("client call failed, error:", oError);
  } else {
    console.log("client call succeeded, result:", xResult);
  };
  bClientCallFinished = true;
  if (bServerCallHandled) {
    oServer.fStop();
  };
};