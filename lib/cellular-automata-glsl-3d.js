"use strict";

function printFloat (v) {
  return (v === (v|0) ? v.toFixed(1) : v.toString(10));
}

function generateGetPosText () {
  return [
    'ivec2 getPosText(const in ivec3 position) {',
    '  int sposition = position.x + position.y * iStrideY + position.z * iStrideZ;',
    '  return ivec2(',
    '    sposition % iTextureSize.x,',
    '    sposition / iTextureSize.x',
    '  );',
    '}'
  ].join('\n');
}

function generateGetPixelGlsl (outOfBoundValue) {
  outOfBoundValue = outOfBoundValue || 0;

  if (outOfBoundValue === 'clamp') {
    return [
      'int getPixel(const in ivec3 currentPos, const in ivec3 add) {',
      '  ivec3 position = clamp(currentPos + add, ivec3(0), iRealSize - 1);',
      '  return unpackValue(texelFetch(iBackbuffer, getPosText(position), 0).x);',
      '}'
    ].join('\n');
  } else if (outOfBoundValue === 'wrap') {
    return [
      'int getPixel(const in ivec3 currentPos, const in ivec3 add) {',
      '  ivec3 position = (currentPos + add + iRealSize) % iRealSize;',
      '  return unpackValue(texelFetch(iBackbuffer, getPosText(position), 0).x);',
      '}'
    ].join('\n');
  } else {
    return [
      'int getPixel(const in ivec3 currentPos, const in ivec3 add) {',
      '  ivec3 position = currentPos + add;',
      '  if(',
      '    position.x < 0 || position.x >= iRealSize.x ||',
      '    position.y < 0 || position.y >= iRealSize.y ||',
      '    position.z < 0 || position.z >= iRealSize.z',
      '  ) {',
      '    return ' + outOfBoundValue + ';',
      '  } else {',
      '    return unpackValue(texelFetch(iBackbuffer, getPosText(position), 0).x);',
      '  }',
      '}'
    ].join('\n');
  }
}

function generateGetNeighbourhood (neighbourhood) {
  var glsl = [
    'const int neighboursCount = ' + neighbourhood.length + ';',
    'const ivec3 neighbours[] = ivec3[' + neighbourhood.length + '](',
    neighbourhood.map(function (n) {
      return '  ivec3(' + n[0] + ', ' + n[1] + ', ' + n[2] + ')'
    }).join(',\n'),
    ');',
    '',
    'int getNeighbourhood(const in ivec2 currentPos) {',
    '  int sposition = currentPos.x + currentPos.y * iTextureSize.x;',
    '  ivec3 pixelPos = ivec3(',
    '    sposition % iRealSize.x,',
    '    (sposition / iStrideY) % iRealSize.y,',
    '    sposition / iStrideZ',
    '  );',
    '  int sum = 0;',
    '  for (int i = 0; i < neighboursCount; i++) {',
    '    sum += getPixel(pixelPos, neighbours[i]) > 0 ? 1 : 0;',
    '  }',
    '  return sum;',
    '}'
  ];

  return glsl.join('\n');
}

function generateGetNeighbourhoodCond (neighbourhood) {
  var glsl = [
    'const int neighboursCount = ' + neighbourhood.length + ';',
    'const ivec3 neighbours[] = ivec3[' + neighbourhood.length + '](',
    neighbourhood.map(function (n) {
      return '  ivec3(' + n[0] + ', ' + n[1] + ', ' + n[2] + ')'
    }).join(',\n'),
    ');',
    '',
    'int getNeighbourhoodCond(const in ivec2 currentPos, const in int desiredValue) {',
    '  int sposition = currentPos.x + currentPos.y * iTextureSize.x;',
    '  ivec3 pixelPos = ivec3(',
    '    sposition % iRealSize.x,',
    '    (sposition / iStrideY) % iRealSize.y,',
    '    sposition / iStrideZ',
    '  );',
    '  int sum = 0;',
    '  for (int i = 0; i < neighboursCount; i++) {',
    '    sum += getPixel(pixelPos, neighbours[i]) == desiredValue ? 1 : 0;',
    '  }',
    '  return sum;',
    '}'
  ];

  return glsl.join('\n');
}

function generateRandomFunction () {
  return [
    'float rand(vec2 co, float seed) {',
    '  float a = 12.9898;',
    '  float b = 78.233;',
    '  float c = 43758.5453;',
    '  float dt = dot(co.xy + vec2(seed, 0.), vec2(a,b));',
    '  float sn = mod(dt + iFrame / a, 3.14);',
    '  return fract(sin(sn) * c);',
    '}'
  ].join('\n');
}

function generateEqualityCheck (values, variable) {
  var checkString = [],
    groupedValues = [],
    previousValue = null,
    i;

  variable = variable || 'sum';

  if (values && values.length) {
    values.sort(function(a, b) {
      return a - b;
    });

    for (i = 0; i < values.length; i++) {
      if (previousValue === values[i]) {
        continue;
      } else if (previousValue === values[i] - 1) {
        groupedValues[groupedValues.length - 1].push(values[i]);
      } else {
        groupedValues.push([values[i]]);
      }

      previousValue = values[i];
    }

    for (i = 0; i < groupedValues.length; i++) {
      if (groupedValues[i].length > 1) {
        checkString.push('(' + variable + ' >= ' + groupedValues[i][0] + ' && ' + variable + ' <= ' + groupedValues[i][groupedValues[i].length - 1] + ')');
      } else {
        checkString.push(variable + ' == ' + groupedValues[i][0]);
      }
    }
  } else {
    checkString.push('false');
  }

  return checkString.length > 1 ? '(' + checkString.join(' || ') + ')' : checkString[0];
}

function generateProbabilityCheck(probabilities, sumVariable, positionVariable) {
  var checkString = [],
    groupedValues = [],
    groupProbabilities = [],
    seed = Math.random(),
    value = null,
    probability = null,
    previousValue = null,
    previousProbability = null,
    i;

  sumVariable = sumVariable || 'sum';
  positionVariable = positionVariable || 'position';

  for (i in probabilities) {
    value = parseInt(i, 10);
    probability = probabilities[i];

    if (previousValue === value - 1 && previousProbability === probability) {
      groupedValues[groupedValues.length - 1].push(value);
    } else {
      groupedValues.push([value]);
      groupProbabilities.push(probability);
    }

    previousValue = value;
    previousProbability = probability;
  }

  if (groupProbabilities.length) {
    for (i = 0; i < groupProbabilities.length; i++) {
      probability = groupProbabilities[i];

      if (probability === 1) {
        if (groupedValues[i].length > 1) {
          checkString.push('(' + sumVariable + ' >= ' + groupedValues[i][0] + ' && ' + sumVariable + ' <= ' + groupedValues[i][groupedValues[i].length - 1] + ')');
        } else {
          checkString.push(sumVariable + ' == ' + groupedValues[i][0]);
        }
      } else if (probability > 0) {
        if (groupedValues[i].length > 1) {
          checkString.push('(' + sumVariable + ' >= ' + groupedValues[i][0] + ' && ' + sumVariable + ' <= ' + groupedValues[i][groupedValues[i].length - 1] + ' && rand(vec2(' + positionVariable + '), ' + printFloat(seed) + ') < ' + printFloat(probability) + ')');
        } else {
          checkString.push('(' + sumVariable + ' == ' + groupedValues[i][0] + ' && rand(vec2(' + positionVariable + '), ' + printFloat(seed) + ') < ' + printFloat(probability) + ')');
        }
      }
    }
  } else {
    checkString.push('false');
  }

  return checkString.length > 1 ? '(' + checkString.join(' || ') + ')' : checkString[0];
};

function generateProcessGlslGenerations (neighbourhood, stateCount, survival, birth) {
  var glsl = [
    generateGetNeighbourhoodCond(neighbourhood),
    '',
    'int process(const in int currentValue, const in ivec2 position) {',
    '  int sum = getNeighbourhoodCond(position, 1);',
    '  if (currentValue == 0 && ' + generateEqualityCheck(birth) + ') {',
    '    return 1;',
    '  } else if (currentValue == 1 && ' + generateEqualityCheck(survival) + ') {',
    '    return 1;',
    '  } else if (currentValue > 0) {',
    '    return (currentValue + 1) % ' + stateCount + ';',
    '  }',
    '  return 0;',
    '}'
  ];

  return glsl.join('\n');
}

function generateProcessGlslLife (neighbourhood, survival, birth) {
  var glsl = [
    generateGetNeighbourhood(neighbourhood),
    '',
    'int process(const in int currentValue, const in ivec2 position) {',
    '  int sum = getNeighbourhood(position);',
    '  if (currentValue == 0 && ' + generateEqualityCheck(birth) + ') {',
    '    return 1;',
    '  } else if (currentValue > 0 && ' + generateEqualityCheck(survival) + ') {',
    '    return 1;',
    '  }',
    '  return 0;',
    '}'
  ];

  return glsl.join('\n');
}

function generateProcessGlslStochastic (neighbourhood, survival, birth) {
  var glsl = [
    generateRandomFunction(),
    '',
    generateGetNeighbourhood(neighbourhood),
    '',
    'int process(const in int currentValue, const in ivec2 position) {',
    '  int sum = getNeighbourhood(position);',
    '  if (currentValue == 0 && ' + generateProbabilityCheck(birth) + ') {',
    '    return 1;',
    '  } else if (currentValue > 0 && ' + generateProbabilityCheck(survival) + ') {',
    '    return 1;',
    '  }',
    '  return 0;',
    '}'
  ];

  return glsl.join('\n');
}

function generateProcessGlslVote (neighbourhood, votes) {
  var glsl = [
    generateGetNeighbourhood(neighbourhood),
    '',
    'int process(const in int currentValue, const in ivec2 position) {',
    '  int sum = getNeighbourhood(position) + (currentValue > 0 ? 1 : 0);',
    '  if (' + generateEqualityCheck(votes) + ') {',
    '    return 1;',
    '  }',
    '  return 0;',
    '}'
  ];

  return glsl.join('\n');
}

function generateProcessGlslLuky (neighbourhood, lowSurvival, highSurvival, lowBirth, highBirth) {
  var glsl = [
    generateGetNeighbourhood(neighbourhood),
    '',
    'int process(const in int currentValue, const in ivec2 position) {',
    '  int sum = getNeighbourhood(position);',
    '  if (currentValue == 0 && sum >= ' + lowBirth + ' && sum <= ' + highBirth + ') {',
    '    return 1;',
    '  } else if (currentValue > 0 && sum >= ' + lowSurvival + ' && sum <= ' + highSurvival + ') {',
    '    return 1;',
    '  }',
    '  return 0;',
    '}'
  ];

  return glsl.join('\n');
}

function generateProcessGlslNluky (neighbourhood, stateCount, lowSurvival, highSurvival, lowBirth, highBirth) {
  var glsl = [
    generateGetNeighbourhoodCond(neighbourhood),
    '',
    'int process(const in int currentValue, const in ivec2 position) {',
    '  int sum = getNeighbourhoodCond(position, 1);',
    '  if (currentValue == 0 && sum >= ' + lowBirth + ' && sum <= ' + highBirth + ') {',
    '    return 1;',
    '  } else if (currentValue == 1 && sum >= ' + lowSurvival + ' && sum <= ' + highSurvival + ') {',
    '    return 1;',
    '  } else if (currentValue == 1) {',
    '    return ' + (2 % (2 + stateCount * 2)) + ';',
    '  } else if (currentValue >= 2) {',
    '    return (currentValue + 2) % ' + (2 + stateCount * 2) + ';',
    '  }',
    '  return 0;',
    '}'
  ];

  return glsl.join('\n');
}

function generateProcessGlslCyclic (neighbourhood, stateCount, threshold, greenbergHastingsModel) {
  var glsl = [
    generateGetNeighbourhoodCond(neighbourhood),
    '',
    'int process(const in int currentValue, const in ivec2 position) {',
    '  int nextValue = (currentValue + 1) % ' + stateCount + ';',
    '  int sum = getNeighbourhoodCond(position, nextValue);',
    '  if (sum >= ' + threshold + (greenbergHastingsModel ? ' || currentValue > 0' : '') + ') {',
    '    return nextValue;',
    '  }',
    '  return currentValue;',
    '}'
  ];

  return glsl.join('\n');
}

function generateProcessGlsl (neighbourhood,rule) {
  if (rule.ruleFormat === 'life' || rule.ruleFormat === 'extended-life') {
    return generateProcessGlslLife(neighbourhood, rule.survival, rule.birth);
  } else if (rule.ruleFormat === 'extended-stochastic') {
    return generateProcessGlslStochastic(neighbourhood, rule.survival, rule.birth);
  } else if (rule.ruleFormat === 'generations' || rule.ruleFormat === 'extended-generations') {
    return generateProcessGlslGenerations(neighbourhood, rule.stateCount, rule.survival, rule.birth);
  } else if (rule.ruleFormat === 'vote') {
    return generateProcessGlslVote(neighbourhood, rule.vote);
  } else if (rule.ruleFormat === 'luky') {
    return generateProcessGlslLuky(neighbourhood, rule.lowSurvival, rule.highSurvival, rule.lowBirth, rule.highBirth);
  } else if (rule.ruleFormat === 'nluky') {
    return generateProcessGlslNluky(neighbourhood, rule.stateCount, rule.lowSurvival, rule.highSurvival, rule.lowBirth, rule.highBirth);
  } else if (rule.ruleFormat === 'cyclic') {
    return generateProcessGlslCyclic(neighbourhood, rule.stateCount, rule.threshold, rule.greenbergHastingsModel);
  }

  throw new Error('Unsupported ruleFormat : ' + rule.ruleFormat);
}

function generateComment (what, rule, dimensions, outOfBoundValue) {
  var comments = [
    '/**',
    ' * ' + what + ' generated by cellular-automata-gpu 1.0.0',
    ' *',
    ' * Rule : ' + rule.ruleString,
    ' * Dimensions : ' + dimensions.length + 'D [' + dimensions.join(', ') + ']',
    ' * Out of bound value : ' + outOfBoundValue,
    ' */'
  ];

  return comments.join('\n');
}

function generateUniformsAndConstants (dimensions, textureWidth, textureHeight) {
  return [
    'uniform sampler2D iBackbuffer;',
    'uniform float iFrame;',
    '',
    'const ivec3 iRealSize = ivec3(' + dimensions[0] + ', ' + dimensions[1] + ', ' + dimensions[2] + ');',
    'const ivec2 iTextureSize = ivec2(' + textureWidth + ', ' + textureHeight + ');',
    'const int iStrideY = ' + dimensions[0] + ';',
    'const int iStrideZ = ' + (dimensions[0] * dimensions[1]) + ';'
  ].join('\n');
}

module.exports = function generateShaders(rule, neighbourhood, dimensions, width, height, outOfBoundValue) {
  if (dimensions.length !== 3) {
    throw new Error('Does not support other dimension than 3D');
  }

  var fragmentGlsl = [
    '#version 300 es',
    '',
    generateComment('Fragment shader', rule, dimensions, outOfBoundValue),
    '',
    '#if GL_FRAGMENT_PRECISION_HIGH == 1',
    '  precision highp float;',
    '  precision highp int;',
    '  precision highp sampler2D;',
    '#else',
    '  precision mediump float;',
    '  precision mediump int;',
    '  precision mediump sampler2D;',
    '#endif',
    '',
    'layout(location = 0) out vec4 fragColor;',
    '',
    generateUniformsAndConstants(dimensions, width, height),
    '',
    '#define unpackValue(packed) int(packed * 255. + 0.5)',
    '#define packValue(unpacked) (float(unpacked) / 255.)',
    '',
    generateGetPosText(),
    '',
    generateGetPixelGlsl(outOfBoundValue),
    '',
    generateProcessGlsl(neighbourhood, rule),
    '',
    'void main() {',
    '  ivec2 position = ivec2(gl_FragCoord.xy);',
    '  int currentValue = unpackValue(texelFetch(iBackbuffer, position, 0).r);',
    '  fragColor = vec4(packValue(process(currentValue, position)));',
    '}',
    ''
  ];

  var vertexGlsl = [
    '#version 300 es',
    '',
    generateComment('Vertex shader', rule, dimensions, outOfBoundValue),
    '',
    'in vec3 aVertexPosition;',
    '',
    'void main() {',
    '  gl_Position = vec4(aVertexPosition, 1.0);',
    '}',
    ''
  ];

  return {
    vertexShader: vertexGlsl.join('\n'),
    fragmentShader: fragmentGlsl.join('\n')
  };
};