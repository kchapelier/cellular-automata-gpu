"use strict";

var GCA = require('../'),
    should = require('chai').should();

describe('Applying rules', function () {
    describe('setRule()', function () {
        it('should accept rule string as argument', function () {
            var ca = new GCA([3,3]);

            ca.setRule('23/3');

            ca.currentRule.rule.neighbourhoodType.should.equal('moore');
            ca.currentRule.rule.neighbourhoodRange.should.equal(1);
            ca.currentRule.rule.ruleString.should.equal('23/3');

            ca.setRule('1/1V2');

            ca.currentRule.rule.neighbourhoodType.should.equal('von-neumann');
            ca.currentRule.rule.neighbourhoodRange.should.equal(2);
            ca.currentRule.rule.ruleString.should.equal('1/1V2');
        });

        it('should return the instance of the CellularAutomata', function () {
            var ca = new GCA([3,3]);

            ca.setRule('1/1V2').should.equal(ca);
        });
    });

    describe('iterate()', function () {
        it('should implicitly make on iteration', function () {
            var ca = new GCA([3,3]);

            ca.array.set(1,1,1);

            ca.setRule('S/B12V');
            ca.iterate();
            ca.finalize();

            // 0 1 0
            ca.array.get(0,0).should.equal(0);
            ca.array.get(1,0).should.equal(1);
            ca.array.get(2,0).should.equal(0);
            // 1 0 1
            ca.array.get(0,1).should.equal(1);
            ca.array.get(1,1).should.equal(0);
            ca.array.get(2,1).should.equal(1);
            // 0 1 0
            ca.array.get(0,2).should.equal(0);
            ca.array.get(1,2).should.equal(1);
            ca.array.get(2,2).should.equal(0);
        });

        it('should allow to make multiple iterations', function () {
            var ca = new GCA([3,3]);

            ca.array.set(1,1,1);

            ca.setRule('S/B12V');
            ca.iterate(2);
            ca.finalize();

            // 1 0 1
            ca.array.get(0,0).should.equal(1);
            ca.array.get(1,0).should.equal(0);
            ca.array.get(2,0).should.equal(1);
            // 0 0 0
            ca.array.get(0,1).should.equal(0);
            ca.array.get(1,1).should.equal(0);
            ca.array.get(2,1).should.equal(0);
            // 1 0 1
            ca.array.get(0,2).should.equal(1);
            ca.array.get(1,2).should.equal(0);
            ca.array.get(2,2).should.equal(1);
        });

        it('should return the instance of the CellularAutomata', function () {
            var ca = new GCA([3,3]);

            ca.setRule('S/B12V');

            ca.iterate(2).should.equal(ca);
        });
    });

    describe('apply() shortcut method', function () {
        it('should implicitly make one iteration', function () {
            var ca = new GCA([3,3]);

            ca.array.set(1,1,1);

            ca.apply('S/B12V');
            ca.finalize();

            // 0 1 0
            ca.array.get(0,0).should.equal(0);
            ca.array.get(1,0).should.equal(1);
            ca.array.get(2,0).should.equal(0);
            // 1 0 1
            ca.array.get(0,1).should.equal(1);
            ca.array.get(1,1).should.equal(0);
            ca.array.get(2,1).should.equal(1);
            // 0 1 0
            ca.array.get(0,2).should.equal(0);
            ca.array.get(1,2).should.equal(1);
            ca.array.get(2,2).should.equal(0);
        });

        it('should allow to make multiple iterations', function () {
            var ca = new GCA([3,3]);

            ca.array.set(1,1,1);

            ca.apply('S/B12V',2);
            ca.finalize();

            // 1 0 1
            ca.array.get(0,0).should.equal(1);
            ca.array.get(1,0).should.equal(0);
            ca.array.get(2,0).should.equal(1);
            // 0 0 0
            ca.array.get(0,1).should.equal(0);
            ca.array.get(1,1).should.equal(0);
            ca.array.get(2,1).should.equal(0);
            // 1 0 1
            ca.array.get(0,2).should.equal(1);
            ca.array.get(1,2).should.equal(0);
            ca.array.get(2,2).should.equal(1);
        });

        it('should return the instance of the CellularAutomata', function () {
            var ca = new GCA([3,3]);

            ca.apply('S/B12V',2).should.equal(ca);
        });
    });
});
