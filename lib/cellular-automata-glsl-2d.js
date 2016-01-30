"use strict";

var printFloat = function printFloat (v) {
    return (v === v|0 ? v.toPrecision(2) : v.toString(10));
};

var generateGetPixelGlsl = function generateGetPixelGlsl (outOfBoundValue) {
    outOfBoundValue = outOfBoundValue || 0;

    if (outOfBoundValue === 'wrap') {
        return [
            'int getPixel(const in vec2 currentPos, const in vec2 add) {',
            '  vec2 pixelPos = fract((currentPos + add) / iResolution);',
            '  return unpackValue(texture2D(iBackbuffer, pixelPos).x);',
            '}'
        ].join('\n');
    } else {
        return [
            'int getPixel(const in vec2 currentPos, const in vec2 add) {',
            '  vec2 pixelPos = (currentPos + add) / iResolution;',
            '  if(pixelPos.x < 0. || pixelPos.y < 0. || pixelPos.x >= 1. || pixelPos.y >= 1.) {',
            '    return ' + outOfBoundValue + ';',
            '  } else {',
            '    return unpackValue(texture2D(iBackbuffer, pixelPos).x);',
            '  }',
            '}'
        ].join('\n');
    }
};

var generateGetNeighbourhood = function (neighbourhood) {
    var glsl = [
        'int getNeighbourhood (const in vec2 currentPos) {',
        '  int sum = 0;',
        ''
    ];

    for (var i = 0; i < neighbourhood.length; i++) {
        var neighbour = neighbourhood[i];
        glsl.push('  sum += getPixel(currentPos, vec2(' + printFloat(neighbour[0]) + ', ' + printFloat(neighbour[1]) + ')) > 0 ? 1 : 0;');
    }

    glsl.push('', '  return sum;', '}');

    return glsl.join('\n');
};

var generateGetNeighbourhoodSum = function (neighbourhood) {
    var glsl = [
        'int getNeighbourhoodSum (const in vec2 currentPos) {',
        '  int sum = 0;',
        ''
    ];

    for (var i = 0; i < neighbourhood.length; i++) {
        var neighbour = neighbourhood[i];
        glsl.push('  sum += getPixel(currentPos, vec2(' + printFloat(neighbour[0]) + ', ' + printFloat(neighbour[1]) + '));');
    }

    glsl.push('', '  return sum;', '}');

    return glsl.join('\n');
};

var generateGetNeighbourhoodCond = function (neighbourhood) {
    var glsl = [
        'int getNeighbourhoodCond (const in vec2 currentPos, const in int desiredValue) {',
        '  int sum = 0;',
        ''
    ];

    for (var i = 0; i < neighbourhood.length; i++) {
        var neighbour = neighbourhood[i];
        glsl.push('  sum += getPixel(currentPos, vec2(' + printFloat(neighbour[0]) + ', ' + printFloat(neighbour[1]) + ')) == desiredValue ? 1 : 0;');
    }

    glsl.push('', '  return sum;', '}');

    return glsl.join('\n');
};

var generateNeighbourhoodGlsl = function generateNeighbourhoodGlsl (neighbourhood) {
    var glsl = [
        generateGetNeighbourhood(neighbourhood),
        '',
        generateGetNeighbourhoodSum(neighbourhood),
        '',
        generateGetNeighbourhoodCond(neighbourhood)
    ];

    return glsl.join('\n');
};

var generateProcessGlslGenerations = function generateProcessGlslGenerations (stateCount, survival, birth) {
    var birthString = [],
        survivalString = [],
        i;

    if (birth.length) {
        for (i = 0; i < birth.length; i++) {
            birthString.push('sum == ' + birth[i]);
        }
    } else {
        birthString.push('false');
    }

    if (survival.length) {
        for (i = 0; i < survival.length; i++) {
            survivalString.push('sum == ' + survival[i]);
        }
    } else {
        survivalString.push('false');
    }

    var glsl = [
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhoodCond(position, 1);',
        '  if (currentValue == 0 && (' + birthString.join(' || ') + ')) {',
        '    return 1;',
        '  } else if (currentValue == 1 && (' + survivalString.join(' || ') + ')) {',
        '    return 1;',
        '  } else if (currentValue > 0) {',
        '    return int(mod(float(currentValue + 1), ' + printFloat(stateCount) + '));',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslLife = function generateProcessGlslLife (survival, birth) {
    var birthString = [],
        survivalString = [],
        i;

    if (birth.length) {
        for (i = 0; i < birth.length; i++) {
            birthString.push('sum == ' + birth[i]);
        }
    } else {
        birthString.push('false');
    }

    if (survival.length) {
        for (i = 0; i < survival.length; i++) {
            survivalString.push('sum == ' + survival[i]);
        }
    } else {
        survivalString.push('false');
    }


    var glsl = [
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhood(position);',
        '  if (currentValue == 0 && (' + birthString.join(' || ') + ')) {',
        '    return 1;',
        '  } else if (currentValue > 0 && (' + survivalString.join(' || ') + ')) {',
        '    return 1;',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslVote = function generateProcessGlslVote (votes) {
    var voteString = [],
        i;

    if (votes.length) {
        for (i = 0; i < votes.length; i++) {
            voteString.push('sum == ' + votes[i]);
        }
    } else {
        voteString.push('false');
    }

    var glsl = [
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhood(position) + (currentValue > 0 ? 1 : 0);',
        '  if (' + voteString.join(' || ') + ') {',
        '    return 1;',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslLuky = function generateProcessGlslLuky (lowSurvival, highSurvival, lowBirth, highBirth) {
    var glsl = [
        'int process(const in int currentValue, const in vec2 position) {',
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
};

var generateProcessGlslNluky = function generateProcessGlslNluky (stateCount, lowSurvival, highSurvival, lowBirth, highBirth) {
    var glsl = [
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhoodCond(position, 1);',
        '  if (currentValue == 0 && sum >= ' + lowBirth + ' && sum <= ' + highBirth + ') {',
        '    return 1;',
        '  } else if (currentValue == 1 && sum >= ' + lowSurvival + ' && sum <= ' + highSurvival + ') {',
        '    return 1;',
        '  } else if (currentValue == 1) {',
        '    return ' + (2 % (2 + stateCount * 2)) + ';',
        '  } else if (currentValue >= 2) {',
        '    return int(mod(float(currentValue + 2), ' + printFloat(2 + stateCount * 2) + '));',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslCyclic = function generateProcessGlslCyclic (stateCount, threshold, greenbergHastingsModel) {
    var glsl = [
        'int process(const in int currentValue, const in vec2 position) {',
        '  int nextValue = int(mod(float(currentValue + 1), ' + printFloat(stateCount) + '));',
        '  int sum = getNeighbourhoodCond(position, nextValue);',
        '  if (sum >= ' + threshold + (greenbergHastingsModel ? ' || currentValue > 0' : '') + ') {',
        '    return nextValue;',
        '  }',
        '  return currentValue;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlsl = function generateProcessGlsl (rule) {
    /*
    // debug process function
    var glsl = [
        'float process(const float currentValue, const int sum) {',
        '  return float(sum) / 255.;',
        '}'
    ];

    return glsl.join('\n');
    */

    if (rule.ruleFormat === 'life' || rule.ruleFormat === 'extended-life') {
        return generateProcessGlslLife(rule.survival, rule.birth);
    } else if (rule.ruleFormat === 'generations' || rule.ruleFormat === 'extended-generations') {
        return generateProcessGlslGenerations(rule.stateCount, rule.survival, rule.birth);
    } else if (rule.ruleFormat === 'vote') {
        return generateProcessGlslVote(rule.vote);
    } else if (rule.ruleFormat === 'luky') {
        return generateProcessGlslLuky(rule.lowSurvival, rule.highSurvival, rule.lowBirth, rule.highBirth);
    } else if (rule.ruleFormat === 'nluky') {
        return generateProcessGlslNluky(rule.stateCount, rule.lowSurvival, rule.highSurvival, rule.lowBirth, rule.highBirth);
    } else if (rule.ruleFormat === 'cyclic') {
        return generateProcessGlslCyclic(rule.stateCount, rule.threshold, rule.greenbergHastingsModel);
    }

    throw new Error('Unsupported ruleFormat : ' + rule.ruleFormat);
};

var generateComment = function generateComment (what, rule, dimensions, outOfBoundValue) {
    var comments = [
        '/**',
        ' * ' + what + ' generated by cellular-automata-glsl 0.1.0',
        ' *',
        ' * Rule : ' + rule.ruleString,
        ' * Dimensions : ' + dimensions.length + 'D [' + dimensions.join(', ') + ']',
        ' * Out of bound value : ' + outOfBoundValue,
        ' */'
    ];

    return comments.join('\n');
};

var generateUniformsAndConstants = function generateUniformsAndConstants (dimensions) {
    return [
        'const vec2 iResolution = vec2(' + dimensions[0] + ', ' + dimensions[1] + ');',
        'uniform sampler2D iBackbuffer;'
    ].join('\n');
};

module.exports = function generateShaders(rule, neighbourhood, dimensions, width, height, outOfBoundValue) {
    if (dimensions.length !== 2) {
        throw new Error('Does not support other dimension than 2D');
    }

    var fragmentGlsl = [
        generateComment('Fragment shader', rule, dimensions, outOfBoundValue),
        '',
        '#ifdef GL_ES',
        'precision highp float;',
        '#endif',
        '',
        generateUniformsAndConstants(dimensions),
        '',
        'int unpackValue(const in float packedValue) {',
        ' return int((packedValue * 255.) + 0.5);',
        '}',
        '',
        'float packValue(const in int unpackedValue) {',
        ' return float(unpackedValue) / 255.;',
        '}',
        '',
        generateGetPixelGlsl(outOfBoundValue),
        '',
        generateNeighbourhoodGlsl(neighbourhood),
        '',
        generateProcessGlsl(rule),
        '',
        'void main() {',
        '  int currentValue = unpackValue(texture2D(iBackbuffer, gl_FragCoord.xy / iResolution).r);',
        '  gl_FragColor = vec4(packValue(process(currentValue, gl_FragCoord.xy)));',
        '}',
        ''
    ];

    var vertexGlsl = [
        generateComment('Vertex shader', rule, dimensions, outOfBoundValue),
        '',
        'attribute vec3 aVertexPosition;',
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
