"use strict";

let chai = require('chai');
chai.use(require("chai-as-promised"));
let expect = chai.expect;
let mockery = require('mockery');
let propertiesReaders = require('./test/PropertiesReaderTestMock');
let TestOpsviewAPIServerV3 = require('./test/TestOpsviewAPIServerV3');
let Opsview = require('./index').Opsview;
let Exceptions = require('./index').Exceptions;

let NON_IMPLEMENTED_VERSION = 999;
let IMPLEMENTED_VERSION = 3;

describe('Opsview JS Library', function () {

	describe('Downtimes', function () {
		describe('Creation',function(){
			it('should protest if the user tries to instantiate a non implemented version', function () {
				let nonImplementedInstantiation = function(){new Opsview(NON_IMPLEMENTED_VERSION);};
				expect(nonImplementedInstantiation).to.throw(Exceptions.OpsviewVersionNotSupportedError);
			});
			it('should instantiate correctly the latest implemented version',function(){
				let latestVersionInstantiation = function(){new Opsview();};
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewVersionNotSupportedError);
			});
			it('should instantiate correctly the implemented version 3',function(){
				let latestVersionInstantiation = function(){new Opsview(IMPLEMENTED_VERSION);};
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewVersionNotSupportedError);
			});
		});
		describe('Usage',function(){
			describe('Version 3',function(){
				//Setup
				let testServer = new TestOpsviewAPIServerV3();
				before(function(done){
					//Initialize the TestOpsviewAPIServer V3.
					testServer.start(done);
				});
				after(function(){
					testServer.stop();
				});
				afterEach(function(){
					mockery.disable(); //Makes sure the mockery is terminated by the time the test case is performed.
				});
				//Tests
				it('Should fail the request if valid credentials are not provided',function(){
					//Modify the properties reader so that it retrieves our test server with valid credentials
					mockery.registerMock('properties-reader',propertiesReaders.InvalidPropertiesReaderMock);
					mockery.enable();

					let opsview = new Opsview(IMPLEMENTED_VERSION);
					let invalidCall = function(){opsview.
					expect(
				});
			});
		});
	});
});
