mTCPJSONRPC
===============

Module with classes to make remote procedure calls using JSON over TCP.

Getting Started
---------------
1. Install mTCPJSONRPC via NPM.
  
  `npm install mtcpjsonrpc`
  
  Optionally: rename `mtcpjsonrpc` to `mTCPJSONRPC`: npm is unable to handle the
  complexity of uppercase characters in a module name. Node.js on Windows does
  not have this problem, so renaming the folder is not required for you to use
  the module.
  
2. Require mTCPJSONRPC in your project.
  
  `var mTCPJSONRPC = require("mTCPJSONRPC");`

3. Instantiate a `cServer` to accept connections and request/perform remote
  procedure calls.
  ```
  var dfProcedures = {
    "test": function(oConnection, xData, fCallback) {
      console.log("test argument: " + JSON.stringify(xData));
      fCallback(undefined, "test result");
    },
  };
  var oServer = new mTCPJSONRPC.cServer({"dfProcedures": dfProcedures});
  oServer.on("connect", function (oConnection) {
    oConnection.fCall("test", "test argument", fHandleCallResult);
  });
  function fHandleCallResult(oError, xResult) {
    if (oError) {
      console.log("test failed:", oError);
    } else {
      console.log("test succeeded " + JSON.stringify(xResult));
    };
  };
  ```

4. Instantiate a `cConnection` to a server and request/perform remote
  procedure calls.
  ```
  var oConnection = new mTCPJSONRPC.fConnect({"dfProcedures": dfProcedures});
  oConnection.fCall("test", "test argument", fHandleCallResult);
  ```

Notes
-----
The code in the above two examples shows how both a client and a server can
make RPC calls: both produce `cConnection` instances, that can handle remote
procedure calls as well as be used to make them. Whether the client and server
actually offer any procedures to be executed depends on the `dfProcedures`
property of the `dxOptions` argument (see `cConnection` below for details).

The server and client can be on the same machine or on two different machines.
By default `cServer` instances bind to IP address that is associated with the
computer name and `fConnect` connects to that IP address. Use `localhost` or
`127.0.01` as the hostname to allow only local connections in a server and
connect to that server from the same machine.

Protocol
--------
Information is exchanged using the JSON over TCP protocol as described in the
[mTCPJSON](https://github.com/SkyLined/mTCPJSON) module. When a connection is
established, the ''client'' will request a version using the following message:
  ```
  {"initialize": "TCP JSON RPC version request", "version": "0.1"}
  ```
If the server receives this message and can handle the version, it should
respond with the following message:
  ```
  {"initialize": "TCP JSON RPC version accept", "version": "0.1"}
  ```
The server can then start making calls.
If the server receives a ''version request'' message and can not handle the
version, it should respond with the following message:
  ```
  {"initialize": "TCP JSON RPC version reject", "version": "0.2"}
  ```
  Where "0.2" is any other version the server would like the client to use.

The server can not make calls at this point, as the protocol version has not
been established. The server instead waits for the client to close the
connection or send another ''version request'' message with a different version
number.

If the client receives a ''version accept'' message, it will emit the
`initialize` event, after which you can start making remote procedure calls.
If the client receives a ''version reject'' message, it will close the
connection, and emit an `error` event.

Once a ''version accept'' message is received by the client, both parties can
make a remote procedure call by sending a message in the following format:
  ```
  {"call":"procedure name", "data": ..., "id": 0}
  ```
The `call` field specifies the name of the remote procedure to call and must be
a `string`. The `data` field specifies the argument to be passed to the
procedure and can by any value encoded as JSON. The `id` field is optional and
must be a positive integer and should have been used in any ''call'' message
before. The `id` field is only populated if the caller would like to have a
result returned.
When a remote procedure has been executed, the result can returned to the caller
by sending a message in the following format:
  ```
  {"result": {"error": {...}, "data": ..., "id": 0}
  ```
The `error` field specifies any error that may have occurred during execution of
the procedure. if it is `undefined` the `data` field specifies any data that the
procedure would like to return to the caller.

API
-----
### `class cServer`
Can be used to accept connections, through which you can send values as JSON.

#### Constructors:
##### `[new] mTCPJSON.cServer(Object dxOptions);`
Where `dxOptions` is an object that can have the following properties:
- `Number uIPVersion`: IP version to use (valid values: 4 (default), 6).
- `String sHostname`: Network device to bind to (default: computer name, use
             `localhost` if you want to accept connections only from scripts
             running on the same machine).
- `Number uPort`: port number to send to (default: 28876).
- `Number uConnectionKeepAlive`: Enable sending [TCP keep-alive]
          (http://en.wikipedia.org/wiki/Keepalive#TCP_keepalive)
          packets every `uConnectionKeepAlive` milliseconds.
- `Object dfProcedures`: associative array of procedures that the server will
          execute at the request of a connected client. See `cConnection` below
          for details.
          

#### Events:
##### `error`, parameter: `Error oError`
Emitted when there is a network error.
##### `start`
Emitted when the `cServer` instance is ready to receive connections.
##### `connect`, parameter: `cConnection oConnection`
Emitted when a connection to the server is established.
##### `stop`
Emitted when the `cServer` instance has stopped receiving connections. This
can happen when there is a network error or after you tell the sender to stop.

#### Methods:
##### `undefined fStop(bDisconnect)`
Stop the `cServer` instance. If `bDisconnect` is `false`, the server stops
accepting new connections and will wait for existing connections to close. If
`bDisconnect` is true, the server will also disconnect all existing connections.
The server will emit a `stop` event as soon as it no longer accepts new
connections and there are no more open connections.

### `undefined fConnect(Function fCallback, Object dxOptions)
Where `dxOptions` is an object that can have the following properties:
- `Number uIPVersion`: IP version to use (valid values: 4 (default), 6).
- `String sHostname`: Target computer (default: connect to local computer).
- `Number uPort`: port number to connect to (default: 28876).
- `Number uConnectionKeepAlive`: Enable sending [TCP keep-alive]
          (http://en.wikipedia.org/wiki/Keepalive#TCP_keepalive)
          packets every `uConnectionKeepAlive` milliseconds.
- `Object dfProcedures`: associative array of procedures that the server will
          execute at the request of a connected client. See `cConnection` below
          for details.
`fConnect` attempts to establish a connection of a `cServer` instance using the
provided `dxOptions`. `fCallback(Error oError, cConnection oConnection)` is
called when a connection cannot be established (`oError` will contain details)
or when a connection has been established (`oError` will be `undefined`).

### `class cConnection`
Represent connections through which data can be transmitted as JSON messages.
Instances of `cConnection` are emitted through the `connect` event of `cServer`
instances, and passed to the callback of the `fConnect` function. You should not
need to instantiate this class yourself unless you are doing some serious
re-purposing of the code.

#### Events:
##### `error`, parameter: `Error oError`
Emitted when there is a network error.
##### `initialize`
Emitted when the `cConnection` instance has been initialize, i.e. the client and
server have negotiated an TCP JSON TPC version and the connection can be used to
make calls.
##### `disconnect`
Emitted when the `cConnection` instance has stopped receiving messages. This
happens when there is a network error or after you tell the connection to
disconnect.

#### Methods:
##### `undefined fCall(String sProcedureName, Any xData[, Function fCallback])`
Request a remote procedure call for the procedure with the given name. Any value
provided in xData is passed to the remote as an argument to be provided to the
procedure. If `fCallback` is not `undefined`, `fCallback(cConnection
oConnection, Error oError, Any xData)` is called when the remote procedure call
is finished and the remote has return the result. In this case the remote
procedure can return any error in `oError` or if `oError` is `undefined`, return
a result value in `xData`. If the remote procedure call fails for some reason,
the callback is also called with `oError` containing details. If the result is
not returned before a timeout, the callback is also called with `oError`
containing details.
##### `undefined fDisconnect()`
Disconnect the `cConnection` instance.

### `object mTCPJSON.oErrorCodes`
Contains a list of common error codes used to identify errors in the RPC layer.
#### Properties:
##### `iConnectionFailed = -1`
This error code is used to indicate the network connection failed. E.g. the
connection was closed or the network is down.
##### `iInvalidJSON = -2`
This error code is used to indicate the remote sent an invalid JSON message.
E.g. the remote sent "{", which is not valid JSON.
##### `iInvalidJSONRPC = -3`
This error code is used to indicate a number of situations:
- the remote sent an invalid JSON message that is an invalid JSON RPC message.
  (e.g. "0", "[]" or "{}").
- the remote sent a JSON RPC version negotiation message after version
  negotiation is finished.
- the remote sent a JSON RPC version negotiation message that is invalid for
  the current stage of version negotiation. (e.g. rejecting or accepting a
  version before a request is made).
- the remote sent an invalid JSON RPC version negotiation message (e.g.
  rejecting or accepting a version that was not requested).
- the remote rejected all acceptable JSON RPC versions.
##### `iProcedureNotFound = -4`
This error code is used to indicate that the remote does not know the requested
procedure name and therefore cannot execute the call.
##### `iInvalidId = -5`
This error code is used to indicate that the remote does not know the id for
which a result was sent back. This can happen when local stub is broken, or if
a procedure call did not return its result before the remote assumed it had
timed out.
##### `iProcedureFailed = -6`
This error code is used to indicate that the remote procedure threw an unhandled
exception.
##### `iResultTimeout = -7`
This error code is used to indicate that the remote assumes the requested
procedure call has timed out and will not return a result.

--------------------------------------------------------------------------------

### License
This code is licensed under [CC0 v1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
