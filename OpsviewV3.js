"use strict";

var Promise = require('bluebird');
var PropertiesReader = require('properties-reader');
var util = require('util');
var extend = util._extend;
var fs = require('fs');
var http = require('request-promise');
var hrt = require('human-readable-time');
var Exceptions = require('./exceptions');
var OpsviewPropertiesFileNotFoundError = Exceptions.OpsviewPropertiesFileNotFoundError;
var OpsviewAuthenticationError = Exceptions.OpsviewAuthenticationError;
var OpsviewApiError = Exceptions.OpsviewApiError;

/**
 * Main class to interact with opsview.
 * Opsview API version: 3.013
 */
class OpsviewV3 {
    /**
     * @constructor
     * @throws OpsviewPropertiesFileNotFoundError if the opsview file is not found
     */
    constructor() {
        this.token = null;
        this.username = this._getOpsviewProperties().get(USERNAME_KEY);
        this.password = this._getOpsviewProperties().get(PASSWORD_KEY);
        this.opsviewHost = this._getOpsviewProperties().get(OPSVIEW_HOST_KEY);
	}

	/**
	 * Reloads the configuration of the server so that all pending changes are applied. Can be scheduled
	 * instead of being performed immediately. If it is, then the reload is cancelable, by invoking the
	 * cancelReload method of this class before the execution.
	 * Since the scheduling is performed with a simple setTimeout, the nodejs process needs to be alive
	 * to launch the execution in case it is scheduled.
	 * TODO: still to implement
	 * @param startTime {Date} - When to execute the reload. Will schedule it with setTimeout invocation
	 * 	                         which means that if the node process attending this petition is dead, it
	 * 	                         won't execute. Must be in the future compared to the current date.                         
	 * @return {Promise} - 
	 * 		If a date is not set, A Promise  with the following result:
	 * 	status 200: {
	 *		server_status: ...,
	 *		configuration_status: ...,
	 *		average_duration: ...,
	 *		lastupdated: ...,
	 *		auditlog_entries: ...,
	 *		messages: [ ... ]
	 * 	}
	 * 		if a date is provided, it returns an empty promise, or throws an Error if the date is invalid.
	 * 	@throws OpsviewReloadAlreadyInPlace - If executed without scheduling, and a reload is already in process
	 * 	                                      this method will launch this exception.
	 * 	@throws Error - If the startTime is a date before the current date.
	 */
	reload(startTime){

		var operationPromise = this._buildOptionsFor(REQUEST_OPTIONS.RELOAD,ENDPOINTS.RELOAD,true)
			.bind(this)
			.then(function(requestObject){
				//Since a reload may already be happening by the time this method starts
				//we must check.
				if(!this._isReloadLocked()){
					this._lockReload();

					return http(requestObject)
						.then(function(response){
							if(response.statusCode === 409) {
								throw new Exceptions.OpsviewReloadAlreadyInPlace();
							}

							return response;
						});
				} else {
					throw new Exception.OpsviewReloadAlreadyInPlace();
				}
			})
			.finally(function(){ //Make sure the reload process is unlocked upong ending the reload.
				this._unlockReload();	
			});

		var resultPromise = null;
		
		if(!_isReloadLocked()){
			_lockReload();
			var isReloadScheduled = (typeof startTime !== "undefined");
			if(isReloadScheduled){
				resultPromise = new Promise(function(resolve){
					var diffTime = startTime - (new Date());
					if(diffTime < 0) {
						throw new Error(`The start time must be in the future, but was: ${startTime}`);
					}
					//TODO: implement a locking mechanism for relops so that it can be cancelled.
					//Once the timeout is set, we can only log errors, not act upon them.
					setTimeout(function(){
							operationPromise
								.then(function(){}) //We can do nothing with the result
								.catch(function(error){
									console.error(`There was an error while performing the reload request: ${error.message}`);	
								});
						},
						diffTime);
					//We return immediately, we're not waiting for the scheduling to take place.
					//We hope for the best
					resolve();
				});
			} else {
				resultPromise = operationPromise;
			}
		} else {
			//If the reload process is locked, then we generate
			//a promise that fails.
			resultPromise = new Promise(function(fullfil,reject){
				reject(new Exceptions.OpsviewReloadAlreadyInPlace());
			});
		}

		return resultPromise;
	}

    /**
     * Sets a downtime on a host or set of hosts
     * to a series of checks/services.
     * @return {Promise} - a Promise with the downtimes object result which is of the following form:
     *   {
     *     summary: {
     *       num_hostgroups: ...,
     *       num_hosts: ...,
     *       num_services : ...
     *     },
     *     list: {
     *       hostgroups: [
     *         { id: ..., name: ... }
     *       ],
     *       hosts: [
     *         { id: ..., hostname: .... }
     *       ],
     *       services: [
     *         { id : ..., hostname : ..., servicename : ... },
     *       ]
     *     }
     * @throws OpsviewApiError if the API returned an error.
     */
    setDowntime(startTime, endTime, comment, hostPattern, servicesPattern) {
        return this._buildOptionsFor(REQUEST_OPTIONS.CREATE_DOWNTIME, ENDPOINTS.DOWNTIMES)
            .bind(this)
            .then(function (requestObject) {
                OpsviewV3._selectHostAndService(requestObject, hostPattern, servicesPattern);
				var opsviewDateFormat = new hrt('%YYYY%/%MM%/%DD% %hh%:%mm%:%ss%');
                requestObject.body.starttime = opsviewDateFormat(startTime);
                requestObject.body.endtime = opsviewDateFormat(endTime);
                requestObject.body.comment = comment;

                return http(requestObject)
                    .catch(function(errorObject){
						console.log("Error: "+util.inspect(errorObject));
                        throw new OpsviewApiError(errorObject);
                    });
            });
    }

    /**
     * Modifies an opsview API request object to filter the request to
     * the specified hosts and services with the official host and services
     * patterns (which admits wildcards characters %).
     * @param requestObject {object} - The request object as built by _buildOptionsFor
     * @param hostPattern {string} - a wildcard pattern for hosts
     * @param servicePattern {string} - optional. a wildcard pattern for services
     * @private
     * @static
     */
    static _selectHostAndService(requestObject, hostPattern, servicePattern) {
        requestObject.qs['svc.hostname'] = hostPattern;
        if(typeof servicePattern !== 'undefined') {
            requestObject.qs['svc.servicename'] = servicePattern;
        }
    }

    /**
     * Builds a request object for the http request method. If no token has already been fetched from the server,
     * it retrieves it now. This forces the result to be a promise.
     * An http request object has the following form:
     *   {
     *     uri: urlValue,
     *     method: httpMethod,
     *     headers: {
     *       X-Opsview-Username: usernameValue,
     *       X-Opsview-Token: tokenstring,
     *       header1: value,
     *       header2: value,
     *     },
     *     json:true,
     *     body:{
     *       param1: value1
     *     }
     *   }
     *
     * @param operation {string} - The operation to perform, selected from the REQUEST_OPTIONS enum.
     * @param endpoint {string} - the endpoint to reach, selected from the ENDPOINTS enum.
     * @param fetchToken {boolean} - Whether to retrieve the token from the server if it doesn't exist. Defaults to true if not specified
     * @return {Promise} an initialized http request object.
     * @throws OpsviewAuthenticationError if the opsview rest api produced an error while authenticating while retrieving the token
     * @private
     */
    _buildOptionsFor(operation, endpoint, fetchToken) {
        fetchToken = typeof fetchToken === 'undefined' ? true : fetchToken;
        var result = null;

        let requestOptions = extend({}, operation);
        requestOptions.uri = this.opsviewHost + endpoint;
        if (this.token === null && fetchToken) {
            result = this._getToken()
                .bind(this)
                .then(function (token) {
                    requestOptions.headers[OPSVIEW_HEADER_USERNAME] = this.username;
                    requestOptions.headers[OPSVIEW_HEADER_TOKEN] = token;
                    return requestOptions;
                });
        } else {
            let self = this;
            result = new Promise(function (resolve) {
                requestOptions.headers[OPSVIEW_HEADER_USERNAME] = self.username;
                requestOptions.headers[OPSVIEW_HEADER_TOKEN] = self.token;
                resolve(requestOptions);
            });
        }

        return result;
    }

    /**
     * Connects to the opsview API to obtain a token if it has no token.
     * @return {Promise}
     * @throws OpsviewAuthenticationError if the opsview rest api produced an error while authenticating
     * @private
     */
    _getToken() {
        return this._buildOptionsFor(REQUEST_OPTIONS.AUTHENTICATION, ENDPOINTS.AUTHENTICATION, false)
            .bind(this)
            .then(function (requestObject) {
                requestObject.body.username = this.username;
                requestObject.body.password = this.password;

                return http(requestObject).promise().bind(this)
                    .then(function (response) {
                        this.token = response.token;
                        return this.token;
                    })
                    .catch(function(error) {
                        throw new OpsviewAuthenticationError(`The opsview authentication api throwed an error: ${error.error.message}`);
                    });
            });
    }

    /**
     * Obtains a properties object from the opsview properties file that must exist
     * in $HOME/.opsview_secret
     * @returns {PropertiesReader}
     * @throws {OpsviewPropertiesFileNotFoundError} if the opsview file is not found
     * @private
     */
    _getOpsviewProperties() {
        if (typeof this.opsviewPropertiesFile === 'undefined') {
            try {
                this.opsviewPropertiesFile = PropertiesReader(_getHomeDir() + "/" + OPSVIEW_SECRET_FILE);
            } catch (error) { //Normalize file not found error
                throw new OpsviewPropertiesFileNotFoundError('The opsview properties file must exist in HOME/.opsview_secret');
            }
        }

        return this.opsviewPropertiesFile;
    }

	/**
	 * Only one config reload can be performed simultanously.
	 * The locking is implemented with a file. If the file
	 * exists, then the reload method cannot be called.
	 * To unlock the 
	 */ 
	_lockReload(){
		var lockFile = _getHomeDir()+'/'+OPSVIEW_RELOAD_LOCK_FILE;
		fs.closeSync(fs.openSync(lockFile, 'w'));
	}

	/**
	 * Unlocks the reload process by deleting the lock file
	 */
	_unlockReload(){
		var lockFile = _getHomeDir()+'/'+OPSVIEW_RELOAD_LOCK_FILE;
		fs.unlinkSync(lockFile);
	}

	/**
	 * Checks whether the reload process is locked by
	 * checking for the presence of the lock file.
	 */
	_isReloadLocked(){
		var result = false;
		//Canon way to check for the presence of a file. yuck.
		try {
			var lockFile = _getHomeDir()+'/'+OPSVIEW_RELOAD_LOCK_FILE;
			fs.accessSync(lockFile); //If it doesn't throw error, the file exists.
			result = true;
		}catch(error){}

		return result;
	}

	/**
	 * Gets the home dir of the current user.
	 */ 
	_getHomeDir(){
		let isOldWindows = process.platform === 'win32';
		return process.env[isOldWindows ? 'USERPROFILE' : 'HOME'];
	}
}

var OPSVIEW_SECRET_FILE = '.opsview_secret';
var USERNAME_KEY = 'opsview.login.username';
var PASSWORD_KEY = 'opsview.login.password';
var OPSVIEW_RELOAD_LOCK_FILE = '.opsview_reload_lock';
var OPSVIEW_HOST_KEY = 'opsview.host';
var OPSVIEW_HEADER_USERNAME = 'X-Opsview-Username';
var OPSVIEW_HEADER_TOKEN = 'X-Opsview-Token';

var JSON_HEADERS = {
    "Content-type": "application/json"
    //"Accept": "application/json"
};

var REQUEST_OPTIONS = {
    AUTHENTICATION: {
        method: 'POST',
        body: {},qs:{},
        headers: JSON_HEADERS,
        json: true
    },
    CREATE_DOWNTIME: {
        method: 'POST',
        body: {},qs:{},
        headers: JSON_HEADERS,
        json: true
    },
	RELOAD: {
		method: 'POST',
        body: {},qs:{},
        headers: JSON_HEADERS,
        json: true
	}
};

var ENDPOINTS = {
    AUTHENTICATION: "/login",
    DOWNTIMES: '/downtime',
	RELOAD: '/reload'
};

module.exports = OpsviewV3;
