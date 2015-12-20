"use strict";
let OpsviewProxy = requires('./Opsview');
let Exceptions = requires('./exceptions');


/**
 * The main Opsview interface.
 * It's a class you instantiate. Can be used as a singleton per Opsview server as it only holds state about
 * the server and an auth token which can be reused many times.
 * If no version is specified in the constructor, the latest (implemented) api version is assumed.
 * More details in the Opsview.js file.
 */
exports.Opsview = OpsviewProxy;

/**
 * The exceptions used in the library.
 */
exports.Exceptions = Exceptions;