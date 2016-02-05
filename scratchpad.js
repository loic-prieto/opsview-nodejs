"use strict";
var util = require('util');
var hrt = require('human-readable-time');
var Opsview = require('./Opsview.js');

var opsview = new Opsview();

var from = new Date(2016,2,5,20,40);
var to = new Date(2016,2,5,20,59);
var comment = "NodeJS Opsview Library test";
var hostPattern = "fr-redis-azure";
var servicePattern = "Redis TCP Port";

console.log(`I'm going to put a downtime on ${hostPattern} for service ${servicePattern}`);
opsview.setDowntime(from,to,comment,hostPattern,servicePattern)
	.then(function(response){
		console.log(`Resultado: ${util.inspect(response)}`);
	})
	.catch(function(error){
		console.log(`Se ha detectado un error: ${error}`);
	});
