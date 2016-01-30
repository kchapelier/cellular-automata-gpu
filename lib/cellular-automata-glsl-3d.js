"use strict";

var printFloat = function printFloat (v) {
    return (v === v|0 ? v.toFixed(1) : v.toString(10));
};

var generateGetPosText = function generateGetPosText () {
    return [
        'vec2 getPosText(const in ivec3 position) {',
        '  float sposition = float(position.x + position.y * int(iStrideY) + position.z * int(iStrideZ));',
        '  return vec2(',
        '    mod(sposition, iTextureSize.x) / iTextureSize.x,',
        '    floor((sposition / iTextureSize.x)) / iTextureSize.x',
        '  );',
        '}'
    ].join('\n');
};

var generateGetPixelGlsl = function generateGetPixelGlsl (outOfBoundValue) {
    outOfBoundValue = outOfBoundValue || 0;

    if (outOfBoundValue === 'wrap') {
        return [
            'int getPixel(const in vec3 currentPos, const in vec3 add) {',
            '  ivec3 position = ivec3(mod(currentPos + add, iRealSize));',
            '  return unpackValue(texture2D(iBackbuffer, getPosText(position)).x);',
            '}'
        ].join('\n');
    } else {
        return [
            'int getPixel(const in vec3 currentPos, const in vec3 add) {',
            '  ivec3 position = ivec3(currentPos + add);',
            '  if(',
            '    position.x < 0 || position.x >= int(iRealSize.x) ||',
            '    position.y < 0 || position.y >= int(iRealSize.y) ||',
            '    position.z < 0 || position.z >= int(iRealSize.z)',
            '  ) {',
            '    return ' + outOfBoundValue + ';',
            '  } else {',
            '    return unpackValue(texture2D(iBackbuffer, getPosText(position)).x);',
            '  }',
            '}'
        ].join('\n');
    }
};

var generateGetNeighbourhood = function (neighbourhood) {
    var glsl = [
        'int getNeighbourhood (const in vec2 currentPos) {',
        '  float sposition = float(int(currentPos.x) + int(currentPos.y) * int(iTextureSize.x));',
        '  vec3 pixelPos = vec3(',
        '    mod(sposition, iRealSize.x),',
        '    mod(floor(sposition / iStrideY), iRealSize.y),',
        '    floor(sposition / iStrideZ)',
        '  );',
        '  int sum = 0;',
        ''
    ];

    for (var i = 0; i < neighbourhood.length; i++) {
        var neighbour = neighbourhood[i];
        glsl.push('  sum += getPixel(pixelPos, vec3(' + printFloat(neighbour[0]) + ', ' + printFloat(neighbour[1]) + ', ' + printFloat(neighbour[2]) + ')) > 0 ? 1 : 0;');
    }

    glsl.push('', '  return sum;', '}');

    return glsl.join('\n');
};

var generateGetNeighbourhoodSum = function (neighbourhood) {
    var glsl = [
        'int getNeighbourhoodSum (const in vec2 currentPos) {',
        '  float sposition = float(int(currentPos.x) + int(currentPos.y) * int(iTextureSize.x));',
        '  vec3 pixelPos = vec3(',
        '    mod(sposition, iRealSize.x),',
        '    mod(floor(sposition / iStrideY), iRealSize.y),',
        '    floor(sposition / iStrideZ)',
        '  );',
        '  int sum = 0;',
        ''
    ];

    for (var i = 0; i < neighbourhood.length; i++) {
        var neighbour = neighbourhood[i];
        glsl.push('  sum += getPixel(pixelPos, vec3(' + printFloat(neighbour[0]) + ', ' + printFloat(neighbour[1]) + ', ' + printFloat(neighbour[2]) + '));');
    }

    glsl.push('', '  return sum;', '}');

    return glsl.join('\n');
};

var generateGetNeighbourhoodCond = function (neighbourhood) {
    var glsl = [
        'int getNeighbourhoodCond (const in vec2 currentPos, const in int desiredValue) {',
        '  float sposition = float(int(currentPos.x) + int(currentPos.y) * int(iTextureSize.x));',
        '  vec3 pixelPos = vec3(',
        '    mod(sposition, iRealSize.x),',
        '    mod(floor(sposition / iStrideY), iRealSize.y),',
        '    floor(sposition / iStrideZ)',
        '  );',
        '  int sum = 0;',
        ''
    ];

    for (var i = 0; i < neighbourhood.length; i++) {
        var neighbour = neighbourhood[i];
        glsl.push('  sum += getPixel(pixelPos, vec3(' + printFloat(neighbour[0]) + ', ' + printFloat(neighbour[1]) + ', ' + printFloat(neighbour[2]) + ')) == desiredValue ? 1 : 0;');
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

    if (rule.ruleFormat === 'debug') {
        // debug process function
        var glsl = [
            'int process(const int currentValue, const vec2 position) {',
            '  float sposition = float(int(position.x) + int(position.y) * int(iTextureSize.x));',
            '  vec3 pixelPos = vec3(',
            '    mod(sposition, iRealSize.x),',
            '    mod(floor(sposition / iStrideY), iRealSize.y),',
            '    floor(sposition / iStrideZ)',
            '  );',
            '  return int(pixelPos.y);',
            '}'
        ];

        return glsl.join('\n');
    }


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

var generateUniformsAndConstants = function generateUniformsAndConstants (dimensions, textureWidth, textureHeight) {
    return [
        'const vec3 iRealSize = vec3(' + dimensions[0] + ', ' + dimensions[1] + ', ' + dimensions[2] + ');',
        'const vec2 iTextureSize = vec2(' + textureWidth + ', ' + textureHeight + ');',
        'const float iStrideY = ' + printFloat(dimensions[0]) + ';',
        'const float iStrideZ = ' + printFloat(dimensions[0] * dimensions[1]) + ';',
        'const float iMaxPos = ' + printFloat(dimensions[0] * dimensions[1] * dimensions[2]) + ';',
        'uniform sampler2D iBackbuffer;'
    ].join('\n');
};

module.exports = function generateShaders(rule, neighbourhood, dimensions, width, height, outOfBoundValue) {
    if (dimensions.length !== 3) {
        throw new Error('Does not support other dimension than 3D');
    }

    var fragmentGlsl = [
        generateComment('Fragment shader', rule, dimensions, outOfBoundValue),
        '',
        '#ifdef GL_ES',
        '#if GL_FRAGMENT_PRECISION_HIGH == 1',
        '  precision highp float;',
        '  precision highp int;',
        '  precision highp sampler2D;',
        '#else',
        '  precision mediump float;',
        '  precision mediump int;',
        '  precision mediump sampler2D;',
        '#endif',
        '#endif',
        '',
        generateUniformsAndConstants(dimensions, width, height),
        '',
        'int unpackValue(const in float packedValue) {',
        ' return int((packedValue * 255.) + 0.5);',
        '}',
        '',
        'float packValue(const in int unpackedValue) {',
        ' return float(unpackedValue) / 255.;',
        '}',
        '',
        generateGetPosText(),
        '',
        generateGetPixelGlsl(outOfBoundValue),
        '',
        generateNeighbourhoodGlsl(neighbourhood),
        '',
        generateProcessGlsl(rule),
        '',
        'void main() {',
        '  int currentValue = unpackValue(texture2D(iBackbuffer, gl_FragCoord.xy / iTextureSize).r);',
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

    //console.log(fragmentGlsl.join('\n'));

    return {
        vertexShader: vertexGlsl.join('\n'),
        fragmentShader: fragmentGlsl.join('\n')
    };
};
