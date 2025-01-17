/**
 * Extracts function parameter names
 * @param {Function} fn The function to analyze
 * @returns {string[]} Array of parameter names
 */
module.exports = function getFunctionArgs(fn) {
  if (typeof fn !== "function") {
    throw new Error("getFunctionArgs: Expected a function");
  }

  // Get function string representation
  let fnStr = fn.toString().replace(/\s+/g, " ");

  // Handle arrow functions and regular functions
  let args = "";

  if (fnStr.includes("=>")) {
    // Arrow function
    const arrowIndex = fnStr.indexOf("=>");
    const openParenIndex = fnStr.lastIndexOf("(", arrowIndex);
    const closeParenIndex = fnStr.lastIndexOf(")", arrowIndex);

    if (openParenIndex === -1) {
      // Single parameter without parentheses
      args = fnStr.slice(0, arrowIndex).trim();
    } else {
      args = fnStr.slice(openParenIndex + 1, closeParenIndex);
    }
  } else {
    // Regular function
    const start = fnStr.indexOf("(") + 1;
    const end = fnStr.indexOf(")");
    args = fnStr.slice(start, end);
  }

  // Clean up and split the arguments
  return args
    .split(",")
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0);
};
