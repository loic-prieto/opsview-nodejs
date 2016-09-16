"use strict";

var OpsviewVersionNotSupportedError = require('./exceptions').OpsviewVersionNotSupportedError;
var VersionDoesNotSupportMethodError = require('./exceptions').OpsviewVersionDoesNotSupportMethodError;
var OpsviewPropertiesFileNotFoundError = require('./exceptions').OpsviewPropertiesFileNotFoundError; 
/**
 * Proxy object for the OpsviewVX Classes.
 * It will use the version specified in the constructor,
 * or the latest if not specified.
 * This is the public interface to access the library's functionality.
 * Usage example:
 *   let opsview = new Opsview(OPSVIEW_VERSION);
 *   opsview.setDowntime(arguments)
 *          .then(function(result){...})
 *          .catch(OpsviewVersionDoesNotSupportMethodError,function(error){
 *              console.log(`Error while calling setDowntime: ${error.message}`);
 *          });
 *
 * Until the ES6 Proxy object is available in the stable branch of NodeJS, I'm using this
 * construct. When it is, this class will extend Proxy.
 *
 */
class Opsview {
    /**
     * @constructor
     * @param version {number} - optional. If not specified, assumes the latest version implemented.
     */
    constructor(version){
        //If no version is specified, use the latest
        if(typeof version === "undefined"){
            version = LATEST_VERSION;
        }
        this.version = version;
        //Dynamic class instantiating
        try {
            let OpsviewClass = require(`./OpsviewV${version}`);
            this.proxiedObject = new OpsviewClass();
        } catch(error){
			if(error instanceof OpsviewPropertiesFileNotFoundError) {
				throw error;
			} else {
				//An error here means that the code file could not be found.
	            throw new OpsviewVersionNotSupportedError(`The specified version opsview (${version}) is not supported by this library: ${error}`);
			}
        }
    }

    /**
     * Sets a downtime on a host or set of hosts to a series of checks/services.
     * @param startTime
     * @param endTime
     * @param comment
     * @param hostPattern
     * @param servicesPattern
     * @return {Promise}
     * @throws OpsviewVersionDoesNotSupportMethodError if this method is not supported by the specified opsview version.
     */
    setDowntime(startTime,endTime,comment,hostPattern,servicesPattern){
        return this._tryMethod(this.proxiedObject.setDowntime,[startTime,endTime,comment,hostPattern,servicesPattern]);
    }

    /**
	 * Reloads the configuration of the server so that all pending changes are applied.
	 * @param startTime {Date} - When to execute the reload. Will schedule it with at system command in linux.
	 * @return {Promise} - A Promise  with the following result:
	 * 	status 200: {
	 *		server_status: ...,
	 *		configuration_status: ...,
	 *		average_duration: ...,
	 *		lastupdated: ...,
	 *		auditlog_entries: ...,
	 *		messages: [ ... ]
	 * 	}
	 * 	status 409: {
	 *		server_status: 1,
	 *		messages: [ "Reload already running" ]
	 * 	}
	 */
    reload(startTime){
        return this._tryMethod(this.proxiedObject.reload,[startTime]);
    }

    /**
     * Tries to execute a method of the proxied object in a defensive manner.
     * Checks that the method is implemented.
     * @param method {Function} - The method to call on the proxied object
     * @param argumentsArray {object[]} - the argumentsArray to be used in the function
     * @throws OpsviewVersionDoesNotSupportMethodError if the method is not implemented by the proxied object.
     * @private
     *
     */
    _tryMethod(method,argumentsArray){
        if(typeof method === 'undefined' ){
            throw new VersionDoesNotSupportMethodError(`The desired method is not supported in this version (${this.version})`);
        }
        return method.apply(this.proxiedObject,argumentsArray);
    }
}

/**
 * The latest version of the opsview class.
 * @type {number}
 */
var LATEST_VERSION = 3;

module.exports = Opsview;
