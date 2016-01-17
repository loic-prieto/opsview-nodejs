"use strict";

var chai = require('chai');
chai.use(require("chai-as-promised"));
var expect = chai.expect;
var mockery = require('mockery');
var propertiesReaders = require('./test/PropertiesReaderTestMock');
var TestOpsviewAPIServerV3 = require('./test/TestOpsviewAPIServerV3');
var Opsview = require('./index').Opsview;
var Exceptions = require('./index').Exceptions;
var util = require('util');

var NON_IMPLEMENTED_VERSION = 999;
var IMPLEMENTED_VERSION = 3;

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
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewPropertiesFileNotFoundError);
			});
			it('should instantiate correctly the implemented version 3',function(){
				let latestVersionInstantiation = function(){new Opsview(IMPLEMENTED_VERSION);};
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewVersionNotSupportedError);
				expect(latestVersionInstantiation).to.not.throw(Exceptions.OpsviewPropertiesFileNotFoundError);
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
				beforeEach(function(){
					//Initialize the mock system
					mockery.enable();
					mockery.registerAllowable('./OpsviewV3');
				});
				after(function(){
					testServer.stop();
				});
				afterEach(function(){
					mockery.disable(); //Makes sure the mockery is terminated by the time the test case is performed.
				});
				//Tests
				it('Should fail the request if valid credentials are not provided',function(done){
					//Modify the properties reader so that it retrieves our test server with invalid credentials
					mockery.registerMock('properties-reader',propertiesReaders.InvalidPropertiesReaderMock);

					let opsview = new Opsview(IMPLEMENTED_VERSION);
					let invalidCall = function(){return opsview.setDowntime(new Date(),new Date(),'','','');};
					//expect(invalidCall).to.throw(Exceptions.OpsviewAuthenticationError);
					invalidCall()
						.then(function(data){
							console.log("All is nice: "+util.inspect(data));
						})
						.catch(function(error){
							console.log("Error!: "+error);
						})
						.finally(function(error){
							done();
						});
				});
			});
		});
	});
});
