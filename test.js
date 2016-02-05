"use strict";

var chai = require('chai');
chai.use(require("chai-as-promised"));
var expect = chai.expect;
var mockery = require('mockery');
var propertiesReaders = require('./test/PropertiesReaderTestMock');
var TestOpsviewAPIServerV3 = require('./test/TestOpsviewAPIServerV3');
var Opsview = require('./index').Opsview;
var Exceptions = require('./exceptions');
var util = require('util');

var NON_IMPLEMENTED_VERSION = 999;
var IMPLEMENTED_VERSION = 3;

describe('Opsview JS Library', function () {

	describe('General', function () {
		describe('Creation',function(){
			it('should protest if the user tries to instantiate a non implemented version', function () {
				let nonImplementedInstantiation = function(){new Opsview(NON_IMPLEMENTED_VERSION);};
				expect(nonImplementedInstantiation).to.throw(Exceptions.OpsviewVersionNotSupportedError);
			});
			it('should instantiate correctly the latest implemented version',function(){
				let latestVersionInstantiation = function(){new Opsview();};
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewVersionNotSupportedError);
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewPropertiesFileNotFoundError);
			});
			it('should instantiate correctly the implemented version 3',function(){
				let latestVersionInstantiation = function(){new Opsview(IMPLEMENTED_VERSION);};
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewVersionNotSupportedError);
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewPropertiesFileNotFoundError);
			});
		});
	});
	describe('Usage',function(){
		
		describe('Downtimes',function(){
			describe('Version 3',function(){
				//Setup
				let testServer = new TestOpsviewAPIServerV3();
				before(function(done){
					//Initialize the TestOpsviewAPIServer V3.
					testServer.start(done);
				});
				beforeEach(function(){
					//Initialize the mock system
					mockery.enable({useCleanCache: true,warnOnUnregistered: false});
					mockery.resetCache();
				});
				after(function(){
					testServer.stop();
				});
				afterEach(function(){
					mockery.disable(); 
				});
				//Tests
				it('Should fail the request if valid credentials are not provided',function(done){
					//Modify the properties reader so that it retrieves our test server with invalid credentials
					mockery.registerMock('properties-reader',propertiesReaders.InvalidPropertiesReaderMock);

					let opsview = new Opsview(IMPLEMENTED_VERSION);

					opsview.setDowntime()
						.then(function(){
							done("The call shouldn't have succeeded, but returned instead.");
						})
						.catch(Error,function(error){
							if(error.constructor.name !== 'OpsviewAuthenticationError'){
								done(`The call generated an unexpected error: ${error.message}`);
							} else {
								done();
							}
						})
				});
				it('Should set downtimes correctly given the right arguments and authentication',function(){
					//Modify the properties reader so that it retrieves our test server with invalid credentials
					mockery.registerMock('properties-reader',propertiesReaders.ValidPropertiesReaderMock);

					let opsview = new Opsview(IMPLEMENTED_VERSION);
					opsview.setDowntime(new Date(), new Date(), "test comment", "test-host", "test-check:
						.should.eventually.equal("");
				});
			});

		});
	});
});
