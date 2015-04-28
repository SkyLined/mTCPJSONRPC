module.exports = cRPCError;

function cRPCError(iCode, sMessage, xData) {
  var oThis = this;
  Error.call(oThis);
  oThis.message = sMessage;
  oThis.code = iCode;
  if (xData !== undefined) oThis.data = xData;
};
cRPCError.prototype.__proto__ = Error.prototype;
cRPCError.prototype.name = "RPCError";
cRPCError.prototype.toString = function cRPCError_toString() {
  var oThis = this;
  return "RPCError #" + oThis.code + ": " + oThis.message + 
      ("data" in oThis ? ", data: " + JSON.stringify(oThis.data) : "");
};
