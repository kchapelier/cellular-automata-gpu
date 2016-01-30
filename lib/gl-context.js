"use strict";

var isNode = !!(typeof process !== 'undefined' && process.versions && process.versions.node),
    isWeb = !!(typeof window === 'object' && typeof document === 'object'),
    isWorker = !!(typeof WorkerGlobalScope !== 'undefined' && typeof self === 'object' && self instanceof WorkerGlobalScope),
    hasOffscreenCanvas = !!(typeof OffscreenCanvas !== 'undefined');

/**
 * Try to retrieve an headless WebGLRenderingContext
 * @param {int} width
 * @param {int} height
 * @param {object} glOptions
 * @returns {{canvas: *, gl: WebGLRenderingContext, resize: Function}} Object with canvas, gl context and standardized resize function.
 */
var getHeadlessGlContext = function getHeadlessGlContext (width, height, glOptions) {
    var context;

    try {
        context = require('gl')(width, height, glOptions);
    } catch (e) {
        throw new Error('Could not initialize headless WebGLRenderingContext : ' + e.message);
    }

    return {
        canvas: null,
        gl: context,
        resize: function (width, height) {
            this.gl.resize(width, height);
        }
    };
};

/**
 * Try to retrieve a WebGLRenderingContext from either a canvas DOMElement or an OffscreenCanvas
 * @param {int} width
 * @param {int} height
 * @param {object} glOptions
 * @returns {{canvas: *, gl: WebGLRenderingContext, resize: Function}} Object with canvas, gl context and standardized resize function.
 */
var getWebGlContext = function getWebGlContext (width, height, glOptions) {
    var canvas,
        context;

    try {
        if (isWeb) {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
        } else if(hasOffscreenCanvas) {
            canvas = new OffscreenCanvas(width, height); //might crash in Firefox <= 45.x on Mac OS X
        }

        context = canvas.getContext('webgl2', glOptions) || canvas.getContext('webgl', glOptions) || canvas.getContext('experimental-webgl', glOptions);
    } catch (e) {
        throw new Error('Could not initialize WebGLRenderingContext : ' + e.message);
    }

    if (!context) {
        throw new Error('Could not initialize WebGLRenderingContext : not supported');
    }

    return {
        canvas: canvas,
        gl: context,
        resize: function (width, height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    };
};

/**
 * Retrieve an OpenGL context
 * @param {int} [width=64]
 * @param {int} [height=64]
 * @param {object} glOptions
 * @returns {{canvas: *, gl: WebGLRenderingContext, resize: Function}} Object with canvas, gl context and standardized resize function.
 */
var getContext = function getContext (width, height, glOptions) {
    width = width || 64;
    height = height || 64;

    if (isNode) {
        return getHeadlessGlContext(width, height, glOptions);
    } else if(isWeb || isWorker) {
        return getWebGlContext(width, height, glOptions);
    }
};

module.exports = getContext;
