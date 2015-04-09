var cServer = require("./cServer.js"),
    fConnect = require("./fConnect.js");

var bServerReceivedCall = false,
    bServerReceivedResult = false,
    bClientReceivedCall = false,
    bClientReceivedResult = false,
    bClientDisconnected = false,
    bServerDisconnected = false,
    dfServerProcedures = {
      "test": function (oConnection, xData, fCallback) {
        console.log("client->server RPC is executing");
        bServerReceivedCall = true;
        if (xData == "argument") {
          fCallback(undefined, "result");
        } else {
          fCallback(new Error("Invalid argument"));
        }
      },
    },
    dfClientProcedures = {
      "test": function (oConnection, xData, fCallback) {
        console.log("server->client RPC is executing");
        bClientReceivedCall = true;
        if (xData == "argument") {
          fCallback(undefined, "result");
        } else {
          fCallback(new Error("Invalid argument"));
        }
      },
    },
    oServer = new cServer({"dfProcedures": dfServerProcedures});
oServer.on("connect", function (oConnection) {
  console.log("connection established on server-side");
  oConnection.on("initialize", function () {
    console.log("connection initialized on server-side");
    oConnection.fCall("test", "argument", function (oConnection, oError, xResult) {
      console.log("server->client RPC received result");
      if (oError) throw oError;
      if (xResult != "result") throw new Error("Invalid result");
      bServerReceivedResult = true;
      fDisconnectWhenDone(oConnection, "server");
    });
    console.log("server->client RPC requested");
  });
  oServer.fStop(); // No need for any more connections.
  oConnection.on("disconnect", function () {
    bServerDisconnected = true;
    fReportFinishedWhenDone("server");
  });
});
fConnect(function (oError, oConnection) {
  if (oError) throw oError;
  console.log("connection established on client-side");
  oConnection.on("initialize", function () {
    console.log("connection initialized on client-side");
    oConnection.fCall("test", "argument", function (oConnection, oError, xResult) {
      console.log("client->server RPC received result");
      if (oError) throw oError;
      if (xResult != "result") throw new Error("Invalid result");
      bClientReceivedResult = true;
      fDisconnectWhenDone(oConnection, "client");
    });
    console.log("client->server RPC requested");
  });
  oConnection.on("disconnect", function () {
    bClientDisconnected = true;
    fReportFinishedWhenDone("client");
  });
}, {"dfProcedures": dfClientProcedures});

function fDisconnectWhenDone(oConnection, sSide) {
  if (bServerReceivedCall && bServerReceivedResult && bClientReceivedCall && bClientReceivedResult) {
    console.log("connection disconnected from " + sSide + "-side");
    oConnection.fDisconnect();
  };
};
function fReportFinishedWhenDone(sSide) {
  console.log("connection disconnected on " + sSide + "-side");
  if (bServerReceivedCall && bServerReceivedResult && bClientReceivedCall && bClientReceivedResult
      && bServerDisconnected && bClientDisconnected) {
    console.log("test completed successfully");
  };
};