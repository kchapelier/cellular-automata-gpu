"use strict";

var ndarray = require('ndarray');

module.exports = {
  createArray: function (shape, defaultValue) {
    var length = shape.reduce(function (p, v) {
      return p * v;
    }, 1);

    var dataArray = new Uint8Array(length);

    for (var i = 0; i < length; i++) {
      dataArray[i] = defaultValue;
    }

    return ndarray(dataArray, shape);
  }
};