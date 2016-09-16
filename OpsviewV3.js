"use strict";

let Promise = require('bluebird');
let PropertiesReader = require('properties-reader');
let util = require('util');
let extend = util._extend;
let fs = require('fs');
let http = require('request-promise');
let HttpErrors = require('request-promise/errors');
let hrt = require('human-readable-time');
let Exceptions = require('./exceptions');
let OpsviewPropertiesFileNotFoundError = Exceptions.OpsviewPropertiesFileNotFoundError;
let OpsviewAuthenticationError = Exceptions.OpsviewAuthenticationError;
let OpsviewApiError = Exceptions.OpsviewApiError;

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
	 * Initiates an opsview configuration reload so that all config changes are applied.
	 * The reload takes up to 10 minutes, which is why this method returns either an error
	 * or a confirmation that the process has started.
	 * To know the status of the reload, use the method checkReloadStatus.
	 * 
	 * @return {Boolean} - true if the process started sucessfully.
	 * @throws OpsviewReloadAlreadyInPlace - If a reload is already in process this method will launch this exception.
	 */
	reload(){
		
		return this._buildOptionsFor(REQUEST_OPTIONS.RELOAD,ENDPOINTS.RELOAD,true)
			.then((requestObject)=>{
				// A relops takes up to 8 minutes, and this operation returns after it is completed.
				// So we just timeout to 1 second to give time to the REST API to return an error
				// if there's one, and treat a timeout error as a correct return.
				// To see whether the opsview api has finished the reload, use the checkReloadStatus method.
				requestObject.timeout=1000;
				return http(requestObject); 
			})
			.catch(HttpErrors.StatusCodeError,(reason)=>{
				if(reason.statusCode === 409) {
					throw new Exceptions.OpsviewReloadAlreadyInPlace();
				}
			})
			.catch(HttpErrors.RequestError,(reason)=>{
				// The timeout will come here, we just return true.
				return true;
			});
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
            .then((requestObject)=>{
                OpsviewV3._selectHostAndService(requestObject, hostPattern, servicesPattern);
				let opsviewDateFormat = new hrt('%YYYY%/%MM%/%DD% %hh%:%mm%:%ss%');
                requestObject.body.starttime = opsviewDateFormat(startTime);
                requestObject.body.endtime = opsviewDateFormat(endTime);
                requestObject.body.comment = comment;

                return http(requestObject);
            })
			.catch((errorObject)=>{
				console.log("Error: "+util.inspect(errorObject));
				throw new OpsviewApiError(errorObject);
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
        let result = null;

        let requestOptions = extend({}, operation);
        requestOptions.uri = this.opsviewHost + endpoint;
        if (this.token === null && fetchToken) {
            result = this._getToken()
                .then((token)=>{
                    requestOptions.headers[OPSVIEW_HEADER_USERNAME] = this.username;
                    requestOptions.headers[OPSVIEW_HEADER_TOKEN] = token;
                    return requestOptions;
                });
        } else {
            result = new Promise((resolve)=>{
                requestOptions.headers[OPSVIEW_HEADER_USERNAME] = this.username;
                requestOptions.headers[OPSVIEW_HEADER_TOKEN] = this.token;
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
            .then((requestObject)=>{
                requestObject.body.username = this.username;
                requestObject.body.password = this.password;

                return http(requestObject);
            })
			.then((tokenResponse)=>{
				this.token = tokenResponse.token;
				return this.token;
			})
			.catch((error)=>{
				throw new OpsviewAuthenticationError(`The opsview authentication api throwed an error: ${error.error.message}`);
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
				console.log("Looking opsview secret file in: "+this._getHomeDir()+"/"+OPSVIEW_SECRET_FILE);
                this.opsviewPropertiesFile = PropertiesReader(this._getHomeDir() + "/" + OPSVIEW_SECRET_FILE);
            } catch (error) { //Normalize file not found error
                throw new OpsviewPropertiesFileNotFoundError(`The opsview properties file must exist in HOME/.opsview_secret: ${error}`);
            }
        }

        return this.opsviewPropertiesFile;
    }

	/**
	 * Gets the home dir of the current user.
	 */ 
	_getHomeDir(){
		let isOldWindows = process.platform === 'win32';
		return process.env[isOldWindows ? 'USERPROFILE' : 'HOME'];
	}
}

let OPSVIEW_SECRET_FILE = '.opsview_secret';
let USERNAME_KEY = 'opsview.login.username';
let PASSWORD_KEY = 'opsview.login.password';
let OPSVIEW_HOST_KEY = 'opsview.host';
let OPSVIEW_HEADER_USERNAME = 'X-Opsview-Username';
let OPSVIEW_HEADER_TOKEN = 'X-Opsview-Token';

let JSON_HEADERS = {
    "Content-type": "application/json"
};

let REQUEST_OPTIONS = {
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

let ENDPOINTS = {
    AUTHENTICATION: "/login",
    DOWNTIMES: '/downtime',
	RELOAD: '/reload'
};

module.exports = OpsviewV3;
