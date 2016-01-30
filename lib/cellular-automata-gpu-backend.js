"use strict";

var getContext = require('./gl-context');

/**
 * Create the surface to draw onto
 * @param {WebGLRenderingContext} context
 * @returns {WebGLBuffer} Buffer of the surface
 */
var createBuffer = function createBuffer(context) {
    var triangleVertexPositionBuffer = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, triangleVertexPositionBuffer);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 4, 4, -1]), context.STATIC_DRAW);
    triangleVertexPositionBuffer.itemSize = 2;
    triangleVertexPositionBuffer.numItems = 3;

    return triangleVertexPositionBuffer;
};

/**
 * Create a target for rendering
 * @param {WebGLRenderingContext} context
 * @param {int} width
 * @param {int} height
 * @returns {{texture: WebGLTexture, framebuffer: WebGLFrameBuffer}}
 */
var createTarget = function createTarget(context, width, height) {
    var target = {
        texture : context.createTexture(),
        framebuffer : context.createFramebuffer()
    };

    context.bindTexture(context.TEXTURE_2D, target.texture);
    context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, width, height, 0, context.RGBA, context.UNSIGNED_BYTE, null);

    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);

    context.bindFramebuffer(context.FRAMEBUFFER, target.framebuffer);
    context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, target.texture, 0);

    context.bindTexture(context.TEXTURE_2D, null);
    context.bindFramebuffer(context.FRAMEBUFFER, null);

    return target;
};

/**
 * Create a shader
 * @param {WebGLRenderingContext} context
 * @param {int} type FRAGMENT_SHADER or VERTEX_SHADER
 * @param {string} src Source of the shader
 * @returns {WebGLShader}
 */
var createShader = function createShader(context, type, src) {
    var shader = context.createShader(type);
    context.shaderSource( shader, src );
    context.compileShader( shader );

    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        throw new Error('Error creating shader : ' + context.getShaderInfoLog(shader) + '\n' + src);
    }

    return shader;
};

/**
 * Create a program
 * @param {WebGLRenderingContext} context
 * @param {{vertexShader:string, fragmentShader:string}} shaders
 * @returns {WebGLProgram}
 */
var createProgram = function createProgram(context, shaders) {
    var shaderProgram = context.createProgram(),
        vertexShader = createShader(context, context.VERTEX_SHADER, shaders.vertexShader),
        fragmentShader = createShader(context, context.FRAGMENT_SHADER, shaders.fragmentShader );

    context.attachShader(shaderProgram, vertexShader);
    context.attachShader(shaderProgram, fragmentShader);

    context.linkProgram(shaderProgram);

    if (!context.getProgramParameter(shaderProgram, context.LINK_STATUS)) {
        throw new Error('Could not initialise shaders');
    }

    shaderProgram.vertexPositionAttribute = context.getAttribLocation(shaderProgram, 'aVertexPosition');
    context.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.iBackbuffer = context.getUniformLocation(shaderProgram, 'iBackbuffer');

    return shaderProgram;
};

/**
 * Initialize a WebGL-based backend
 * @param {Array} shape
 * @constructor
 */
var GpuBackend = function GpuBackend (shape) {
    this.context = getContext(null, null, {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false
    });

    this.context.gl.disable(this.context.gl.DEPTH_TEST);
    this.context.gl.disable(this.context.gl.DITHER);

    this.setShape(shape);
};

GpuBackend.prototype.shape = null;
GpuBackend.prototype.dimension = null;
GpuBackend.prototype.viewportWidth = null;
GpuBackend.prototype.viewportHeight = null;

GpuBackend.prototype.canvas = null;
GpuBackend.prototype.context = null;
GpuBackend.prototype.triangle = null;

GpuBackend.prototype.rgbaTextureData = null;
GpuBackend.prototype.frontTarget = null;
GpuBackend.prototype.backTarget = null;

/**
 * Set the shape
 * @param {Array} shape
 * @protected
 */
GpuBackend.prototype.setShape = function (shape) {
    var gl = this.context.gl;

    this.shape = shape;
    this.dimension = shape.length;

    if (this.dimension === 2) {
        this.viewportWidth = shape[0];
        this.viewportHeight = shape[1];
    } else if (this.dimension === 3) {
        //TODO it should be possible to optimize the total number of pixels using a rectangular texture instead of a square one
        this.viewportWidth = this.viewportHeight = Math.ceil(Math.sqrt(shape[0] * shape[1] * shape[2]));
    }

    this.context.resize(this.viewportWidth, this.viewportHeight);

    this.rgbaTextureData = new Uint8Array(this.viewportWidth * this.viewportHeight * 4);
    this.frontTarget = createTarget(gl, this.viewportWidth, this.viewportHeight);
    this.backTarget = createTarget(gl, this.viewportWidth, this.viewportHeight);
    this.triangle = createBuffer(gl);
};

/**
 * Execute a given rule for all its iterations
 * @param {object} rule
 * @public
 */
GpuBackend.prototype.execute = function (rule) {
    var shaders = rule.shaders,
        iteration = rule.iteration,
        gl = this.context.gl,
        shaderProgram = createProgram(gl, shaders);

    // set iteration-independent gl settings
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(shaderProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triangle);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.triangle.itemSize, gl.FLOAT, false, 0, 0);
    gl.uniform1i(shaderProgram.iBackbuffer, 0);

    for (var i = 0; i < iteration; i++) {
        this.swapRenderingTargets();
        this.executeProgram(shaderProgram);
    }
};

/**
 * Swap the front and the back target
 * @protected
 */
GpuBackend.prototype.swapRenderingTargets = function () {
    var tmp = this.frontTarget;
    this.frontTarget = this.backTarget;
    this.backTarget = tmp;
};

/**
 * Execute a given WebGLProgram once
 * @param {WebGLProgram} shaderProgram
 * @protected
 */
GpuBackend.prototype.executeProgram = function (shaderProgram) {
    var gl = this.context.gl;

    // set backbuffer
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.backTarget.texture);

    // render to front buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frontTarget.framebuffer);
    gl.drawArrays(gl.TRIANGLES, 0, this.triangle.numItems);
};

/**
 * Read the current state from the texture
 * @param {object} ndarray Instance of ndarray
 * @public
 */
GpuBackend.prototype.read = function (ndarray) {
    var gl = this.context.gl,
        data = this.rgbaTextureData,
        processedData = [],
        i,
        l,
        x,
        y,
        z;

    gl.readPixels(0, 0, this.viewportWidth, this.viewportHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);

    if (this.dimension === 2) {
        for(i = 0, l = data.length / 4; i < l; i++) {
            x = i % this.shape[0];
            y = Math.floor(i / this.shape[0]);

            ndarray.set(x, y, data[i * 4]);
        }
    } else {
        for(i = 0, l = data.length; i < l; i++) {
            x = i % this.shape[0];
            y = Math.floor(i / this.shape[0]) % this.shape[1];
            z = Math.floor(i / (this.shape[0] * this.shape[1]));

            if (z >= this.shape[2]) break;

            ndarray.set(x, y, z, data[i * 4]);

            /*
            if (data[i * 4]) {
                console.log(x, y, z, ndarray.get(x, y, z));
            }
            */
        }
    }

};

/**
 * Write the current state to the texture
 * @param {object} ndarray Instance of ndarray
 * @public
 */
GpuBackend.prototype.write = function (ndarray) {
    var shape = this.shape,
        data = this.rgbaTextureData,
        gl = this.context.gl,
        x,
        y,
        z,
        i;

    if (this.dimension === 2) {
        for (y = 0; y < shape[1]; y++) {
            for (x = 0; x < shape[0]; x++) {
                i = (x + y * shape[0]) * 4;

                data[i] = data[i + 1] = data[i + 2] = data[i + 3] = ndarray.get(x, y);
            }
        }
    } else {
        for (z = 0; z < shape[2]; z++) {
            for (y = 0; y < shape[1]; y++) {
                for (x = 0; x < shape[0]; x++) {
                    i = (x + (y * shape[0]) + (z * shape[0] * shape[1])) * 4;

                    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = ndarray.get(x, y, z);
                    //console.log(data.length, i / 4, data[i]);
                }
            }
        }
    }

    //console.log(data);

    gl.bindTexture(gl.TEXTURE_2D, this.frontTarget.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.viewportWidth, this.viewportHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.bindTexture(gl.TEXTURE_2D, null);
};

module.exports = GpuBackend;
