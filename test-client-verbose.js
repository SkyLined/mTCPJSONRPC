var mTCPJSONRPC = require("../mTCPJSONRPC");

var bServerCallFinished = false,
    bClientCallHandled = false,
    dfProcedures = {
      "test": function (oConnection, xData, fCallback) {
        console.log("test call: received (" + JSON.stringify(xData) + ")");
        fCallback(undefined, "test call result"); // (oError, xResult)
      },
    };

new mTCPJSONRPC.fConnect(fConnectCallback, {"dfProcedures": dfProcedures});
function fConnectCallback(oError, oConnection) {
  if (oError) {
    console.log("connect: error: (" + oError + ")");
  } else {
    console.log("connection: established (" + oConnection + ")");
    oConnection.on("error", function (oError) {
      console.log("connection: error (" + oConnection + ", " + oError + ")");
    });
    oConnection.on("initialize", function () {
      console.log("connection: initialized (" + oConnection + ")");
      function fSendRPCAndShowResult(sProcedure, xData) {
        oConnection.fCall(sProcedure, xData, function(oConnection, oError, xResult) {
          if (oError) {
            console.log("connection: " + JSON.stringify(sProcedure) + " call error (" + oError.toString() + ")");
          } else {
            console.log("connection: " + JSON.stringify(sProcedure) + " call result (" + JSON.stringify(xResult) + ")");
          };
        });
      };
      fSendRPCAndShowResult("test", {"from": "client", "to": "server"});
      console.log("YOU CAN NOW TYPE CALLS, WHICH WILL BE SEND TO THE SERVER WHEN YOU PRESS ENTER.");
      console.log("Calls take the form \"name[:argument]\".");
      console.log("Enter an empty line to disconnect from the server.");
      process.stdin.resume(); // Wait for stdin, so user can type commands
      process.stdin.on("data", function (oBuffer) {
        var sInput = oBuffer.toString("utf8").replace(/[\r\n]*$/, "")
        if (sInput == "") {
          oConnection.fDisconnect();
        } else {
          var asInput = sInput.split(":"),
              sProcedure = asInput.shift(),
              sArgument = asInput.join(":");
          fSendRPCAndShowResult(sProcedure, sArgument);
        };
      });
      oConnection.on("disconnect", function () {
        process.stdin.pause(); // Stop waiting for stdin, so program can exit
      });
    });
    oConnection.on("disconnect", function () {
      console.log("connection: disconnected (" + oConnection + ")");
    });
  };
};

