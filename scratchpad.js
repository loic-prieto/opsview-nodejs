"use strict";
var util = require('util');

/*class Sub extends Error {
	constructor(message){
		super(message);
	}
}

var s = new Sub("lol");

console.log("s is instance of Sub? "+ (s instanceof Error));
console.log("s is instance of Sub? "+ (s instanceof Sub));
console.log("s's message: " + s.message);*/
/*var Exceptions = require('./exceptions');

var e = new Exceptions.OpsviewAuthenticationError('lol');

console.log("Is e instanceof OpsviewAuthenticationError ? "+ (e instanceof Exceptions.OpsviewAuthenticationError));*/
var Exceptions = require('./exceptions');

var e = new Exceptions.OpsviewAuthenticationError('lol');
console.log("Is e instanceof OpsviewAuthenticationError ? "+ (e instanceof Exceptions.OpsviewAuthenticationError));
console.log("Name of the constructor with .name is: " + Exceptions.OpsviewAuthenticationError.name);
console.log("inspect(e): "+util.inspect(e));
console.log("e.constructor:"+e.constructor);
console.log("e.constructor.name: "+e.constructor.name);
console.log("e.__proto__: "+e.__proto__);
console.log("Exceptions.OpsviewAuthenticationError.__proto__: "+Exceptions.OpsviewAuthenticationError.__proto__);
console.log("e.prototype: "+e.prototype);
console.log("Exceptions.OpsviewAuthenticationError.prototype: "+Exceptions.OpsviewAuthenticationError.prototype);
console.log("typeof Exceptions.OpsviewAuthenticationError.prototype: "+(typeof Exceptions.OpsviewAuthenticationError.prototype));
console.log("inspect(Exceptions.OpsviewAuthenticationError.prototype): "+util.inspect(Exceptions.OpsviewAuthenticationError.prototype));
console.log("e is instance of OpsviewAuthenticationError? "+ (e instanceof Exceptions.OpsviewAuthenticationError));
console.log("e is instance of Error? "+ (e instanceof Error));

