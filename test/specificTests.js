"use strict";

var GCA = require('../'),
    should = require('chai').should();

describe('Specific regression tests', function () {
    describe('stochastic rule support in 2D', function () {
        it('should support lack of birth or survival value', function () {
            var ca = new GCA([3,3]);

            ca.apply('E / 0..24:1.0');
            ca.finalize();

            // 1 1 1
            ca.array.get(0,0).should.equal(1);
            ca.array.get(1,0).should.equal(1);
            ca.array.get(2,0).should.equal(1);
            // 1 1 1
            ca.array.get(0,1).should.equal(1);
            ca.array.get(1,1).should.equal(1);
            ca.array.get(2,1).should.equal(1);
            // 1 1 1
            ca.array.get(0,2).should.equal(1);
            ca.array.get(1,2).should.equal(1);
            ca.array.get(2,2).should.equal(1);

            ca.apply('E 0:0.0 /');
            ca.finalize();

            // 1 1 1
            ca.array.get(0,0).should.equal(0);
            ca.array.get(1,0).should.equal(0);
            ca.array.get(2,0).should.equal(0);
            // 1 1 1
            ca.array.get(0,1).should.equal(0);
            ca.array.get(1,1).should.equal(0);
            ca.array.get(2,1).should.equal(0);
            // 1 1 1
            ca.array.get(0,2).should.equal(0);
            ca.array.get(1,2).should.equal(0);
            ca.array.get(2,2).should.equal(0);
        });
    });

    describe('stochastic rule support in 3D', function () {
        it('should support lack of birth or survival value', function () {
            var ca = new GCA([2,2,2]);

            ca.apply('E / 0..24:1.0');
            ca.finalize();

            // 1 1
            ca.array.get(0,0,0).should.equal(1);
            ca.array.get(1,0,0).should.equal(1);
            // 1 1
            ca.array.get(0,1,0).should.equal(1);
            ca.array.get(1,1,0).should.equal(1);


            // 1 1
            ca.array.get(0,0,1).should.equal(1);
            ca.array.get(1,0,1).should.equal(1);
            // 1 1
            ca.array.get(0,1,1).should.equal(1);
            ca.array.get(1,1,1).should.equal(1);

            ca.apply('E 0:0.0 /');
            ca.finalize();

            // 1 1
            ca.array.get(0,0,0).should.equal(0);
            ca.array.get(1,0,0).should.equal(0);
            // 1 1
            ca.array.get(0,1,0).should.equal(0);
            ca.array.get(1,1,0).should.equal(0);


            // 1 1
            ca.array.get(0,0,1).should.equal(0);
            ca.array.get(1,0,1).should.equal(0);
            // 1 1
            ca.array.get(0,1,1).should.equal(0);
            ca.array.get(1,1,1).should.equal(0);
        });
    });
});
