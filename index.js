"use strict";

var utils = require('./lib/utils');
var parser = require('cellular-automata-rule-parser');
var generateShaders2D = require('./lib/cellular-automata-glsl-2d');
var generateShaders3D = require('./lib/cellular-automata-glsl-3d');
var GpuBackend = require('./lib/cellular-automata-gpu-backend');
var moore = require('moore');
var vonNeumann = require('von-neumann');
var unconventionalNeighbours = require('unconventional-neighbours');

var neighbourhoodFunctions = {
  'moore': moore,
  'von-neumann': vonNeumann,
  'axis': unconventionalNeighbours.axis,
  'corner': unconventionalNeighbours.corner,
  'edge': unconventionalNeighbours.edge,
  'face': unconventionalNeighbours.face
};

/**
 * Sort the neighbourhood from left to right, top to bottom, ...
 * @param {Array} a First neighbour
 * @param {Array} b Second neighbour
 * @returns {number}
 */
function neighbourhoodSorter (a, b) {
  a = a.join(',');
  b = b.join(',');
  return a > b ? 1 : a < b ? -1 : 0;
}

function getNeighbourhood (neighbourhoodType, neighbourhoodRange, dimension) {
  neighbourhoodType = !!neighbourhoodFunctions[neighbourhoodType] ? neighbourhoodType : 'moore';
  neighbourhoodRange = neighbourhoodRange || 1;
  dimension = dimension || 2;

  var neighbourhood = neighbourhoodFunctions[neighbourhoodType](neighbourhoodRange, dimension);
  neighbourhood.sort(neighbourhoodSorter);

  return neighbourhood;
}

/**
 * CellularAutomataGpu constructor
 * @param {int[]} shape Shape of the grid
 * @param {int} [defaultValue=0] Default value of the cells
 * @constructor
 */
function CellularAutomataGpu (shape, defaultValue) {
  this.shape = shape;
  this.dimension = shape.length;

  if (this.dimension !== 2 && this.dimension !== 3) {
    throw new Error('CellularAutomataGpu does not support dimensions other than 2 and 3.');
  }

  defaultValue = defaultValue || 0;

  this.array = utils.createArray(shape, defaultValue);
  this.backend = new GpuBackend(this.shape);
  this.rules = [];
}

CellularAutomataGpu.prototype.shape = null;
CellularAutomataGpu.prototype.dimension = null;
CellularAutomataGpu.prototype.array = null;

CellularAutomataGpu.prototype.currentRule = null;
CellularAutomataGpu.prototype.rules = null;
CellularAutomataGpu.prototype.backend = null;

CellularAutomataGpu.prototype.outOfBoundValue = 0;
CellularAutomataGpu.prototype.outOfBoundWrapping = false;
CellularAutomataGpu.prototype.outOfBoundClamping = false;

/**
 * Fill the grid with a given distribution
 * @param {Array[]} distribution The distribution to fill the grid with (ie: [[0,90], [1,10]] for 90% of 0 and 10% of 1). Null values are ignored.
 * @param {function} [rng=Math.random] A random number generation function, default to Math.random()
 * @returns {CellularAutomataGpu} CellularAutomataGpu instance for method chaining.
 */
CellularAutomataGpu.prototype.fillWithDistribution = function (distribution, rng) {
  var sum = 0;
  var array = this.array.data;
  var numberOfDistributions = distribution.length;
  var selection, i, k;

  rng = rng || Math.random;

  for (i = 0; i < numberOfDistributions; i++) {
    sum += distribution[i][1];
  }

  for (k = 0; k < array.length; k++) {
    selection = rng() * sum;

    for (i = 0; i < numberOfDistributions; i++) {
      selection -= distribution[i][1];
      if (selection <= 0 && distribution[i][0] !== null) {
        array[k] = distribution[i][0];
        break;
      }
    }
  }

  return this;
};

/**
 * Define the value used for the cells out of the array's bounds
 * @param {int|string} [outOfBoundValue=0] Any integer value or the string "wrap" to enable out of bound wrapping.
 * @public
 * @returns {CellularAutomataGpu} CellularAutomataGpu instance for method chaining.
 */
CellularAutomataGpu.prototype.setOutOfBoundValue = function (outOfBoundValue) {
  if (outOfBoundValue === 'clamp') {
    this.outOfBoundClamping = true;
    this.outOfBoundWrapping = false;
    this.outOfBoundValue = 0;
  } else if (outOfBoundValue === 'wrap') {
    this.outOfBoundClamping = false;
    this.outOfBoundWrapping = true;
    this.outOfBoundValue = 0;
  } else {
    this.outOfBoundClamping = false;
    this.outOfBoundWrapping = false;
    this.outOfBoundValue = outOfBoundValue | 0;
  }

  if (this.currentRule !== null) {
    this.currentRule = {
      rule: this.currentRule.rule,
      shaders: null,
      iteration: 0
    };
  }

  return this;
};

/**
 * Define the rule of the cellular automata and the neighbourhood to be used.
 * @param {string} rule A rule string in Life, Vote for life, LUKY or Extended format.
 * @public
 * @returns {CellularAutomataGpu} CellularAutomataGpu instance for method chaining.
 */
CellularAutomataGpu.prototype.setRule = function (rule) {
  var parsedRule = parser(rule);

  if (rule === 'debug') {
    parsedRule = {ruleFormat: 'debug'};
  }

  if (parsedRule === null) {
    throw new Error('The rulestring could not be parsed.');
  }

  this.currentRule = {
    rule: parsedRule,
    shaders: null,
    iteration: 0
  };

  return this;
};

/**
 * Apply the previously defined CA rule multiple times.
 * @param {int} [iterationNumber=1] Number of iterations
 * @public
 * @returns {CellularAutomataGpu} CellularAutomataGpu instance for method chaining.
 */
CellularAutomataGpu.prototype.iterate = function (iterationNumber) {
  iterationNumber = iterationNumber || 1;

  if (this.currentRule.iteration === 0) {
    var neighbourhood = getNeighbourhood(this.currentRule.rule.neighbourhoodType, this.currentRule.rule.neighbourhoodRange, this.dimension);
    var outOfBoundValue = this.outOfBoundClamping ? 'clamp' : (this.outOfBoundWrapping ? 'wrap' : this.outOfBoundValue);

    if (this.dimension === 2) {
      this.currentRule.shaders = generateShaders2D(this.currentRule.rule, neighbourhood, this.shape, this.backend.viewportWidth, this.backend.viewportHeight, outOfBoundValue);
    } else if (this.dimension === 3) {
      this.currentRule.shaders = generateShaders3D(this.currentRule.rule, neighbourhood, this.shape, this.backend.viewportWidth, this.backend.viewportHeight, outOfBoundValue);
    }
    this.rules.push(this.currentRule);
  }

  this.currentRule.iteration += iterationNumber;

  return this;
};

/**
 * Apply a given rule for a given number of iterations, shortcut method for setRule and iterate
 * @param {string} rule A rule string in Life, Vote for life, LUKY or Extended format.
 * @param {int} [iteration=1] Number of iterations
 * @public
 * @returns {CellularAutomataGpu} CellularAutomataGpu instance for method chaining.
 */
CellularAutomataGpu.prototype.apply = function (rule, iteration) {
  return this.setRule(rule).iterate(iteration);
};

/**
 * Execute all the stored operation on the GPU
 * @public
 * @returns {CellularAutomataGpu} CellularAutomataGpu instance for method chaining.
 */
CellularAutomataGpu.prototype.finalize = function () {
  if (this.rules.length) {
    this.backend.write(this.array);

    for (var i = 0; i < this.rules.length; i++) {
      this.backend.execute(this.rules[i]);
    }

    this.backend.read(this.array);

    this.rules = [];
  }

  return this;
};

CellularAutomataGpu.prototype.destroy = function () {
  this.backend.destroy();
  this.backend = null;
};

module.exports = CellularAutomataGpu;