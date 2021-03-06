var should = require('should'),
    Base = require('../../src/targets/base'),
    Target = require('../../src/targets/docs-dev'),
    target;

describe('describe task docs-dev', function () {
    before(function () {
        target = new Target({});
    });

    it('should be inheritance of base target', function () {
        target.__proto__.should.be.instanceof(Base)
    });

    it('should have valid name', function () {
        target.getName().should.equal('DOCS DEV SYNCHRONIZATION');
    });

    it('should have valid tasks number', function () {
        target.getTasks().should.be.instanceof(Array).and.have.length(9);
    });
});
