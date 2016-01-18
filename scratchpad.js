"use strict";

class Sub extends Error {
	constructor(message){
		super(message);
	}
}

var s = new Sub("lol");

console.log("s is instance of Sub? "+ (s instanceof Error));
console.log("s is instance of Sub? "+ (s instanceof Sub));
console.log("s's message: " + s.message);
