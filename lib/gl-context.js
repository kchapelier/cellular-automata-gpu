"use strict";

var isWeb = typeof window === 'object' && typeof document === 'object';
var hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

/**
 * Try to retrieve a WebGLRenderingContext from either a canvas DOMElement or an OffscreenCanvas
 * @param {int} width
 * @param {int} height
 * @param {object} glOptions
 * @returns {{canvas: *, gl: WebGLRenderingContext, resize: Function}} Object with canvas, gl context and standardized resize function.
 */
function getWebGlContext (width, height, glOptions) {
  var canvas;
  var context;

  try {
    if (isWeb) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    } else if(hasOffscreenCanvas) {
      canvas = new OffscreenCanvas(width, height); //might crash in Firefox <= 45.x on Mac OS X
    }

    context = canvas.getContext('webgl2', glOptions);
  } catch (e) {
    throw new Error('Could not initialize WebGL2RenderingContext : ' + e.message);
  }

  if (!context) {
    throw new Error('Could not initialize WebGL2RenderingContext : not supported');
  }

  return {
    canvas: canvas,
    gl: context,
    resize: function (width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  };
}

/**
 * Retrieve an OpenGL context
 * @param {int} [width=64]
 * @param {int} [height=64]
 * @param {object} glOptions
 * @returns {{canvas: *, gl: WebGL2RenderingContext, resize: Function}} Object with canvas, gl context and standardized resize function.
 */
function getContext (width, height, glOptions) {
  width = width || 64;
  height = height || 64;

  return getWebGlContext(width, height, glOptions);
}

module.exports = getContext;