var mTCPJSONRPC = require("../mTCPJSONRPC");

var bClientCallFinished = false,
    bServerCallHandled = false,
    dfProcedures = {
      "test": function (oConnection, xData, fCallback) {
        console.log("test call: received (" + JSON.stringify(xData) + ")");
        fCallback(undefined, "test call result"); // (oError, xResult)
      },
      "disconnect": function (oConnection, xData, fCallback) {
        oConnection.fDisconnect();
        fCallback();
      },
      "stop": function (oConnection, xData, fCallback) {
        oServer.fStop();
        fCallback();
      },
      "stop+disconnect": function (oConnection, xData, fCallback) {
        oServer.fStop(true);
        fCallback();
      },
      "no result": function (oConnection, xData, fCallback) {
      },
    },
    oServer = new mTCPJSONRPC.cServer({"dfProcedures": dfProcedures});
oServer.on("error", function (oError) {
  console.log("server: error (" + oError + ")");
});
oServer.on("connect", function (oConnection) {
  console.log("connection: established (" + oConnection + ")");
  oConnection.on("error", function (oError) {
    console.log("connection: error (" + oConnection + ", " + oError + ")");
  });
  oConnection.on("initialize", function () {
    console.log("connection: initialize (" + oConnection + ")");
    oConnection.fCall("test", "test call argument", function(oConnection, oError, xResult) {
      if (oError) {
        console.log("connection: test call error (" + oError.toString() + ")");
      } else {
        console.log("connection: test call result (" + JSON.stringify(xResult) + ")");
      };
    });
  });
  oConnection.on("disconnect", function () {
    console.log("connection: disconnect (" + oConnection + ")");
  });
});
oServer.on("disconnect", function (oConnection) {
  console.log("server: connection disconnected (" + oConnection + ")");
});
oServer.on("start", function (oConnection) {
  console.log("server: started");
});
oServer.on("stop", function (oConnection) {
  console.log("server: stopped");
});
