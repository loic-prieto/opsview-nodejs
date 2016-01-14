"use strict";

let Promise = require('bluebird');
let PropertiesReader = require('properties-reader');
let extend = require('util')._extend;
let http = require('request-promise');
let OpsviewPropertiesFileNotFoundError = require('./exceptions').OpsviewPropertiesFileNotFoundError;
let OpsviewAuthenticationError = require('./exceptions').OpsviewAuthenticationError;
let OpsviewApiError = require('./exceptions').OpsviewApiError;

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
	 * Reloads the configuration of the server so that all pending changes are applied.
	 * @param {Date} 
	 * @return {Promise} - A Promise 
	 */
	/*relops(startTime){
		
	}*/

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
                requestObject.body.starttime = startTime;
                requestObject.body.endtime = endTime;
                requestObject.body.comment = comment;

                return http(requestObject)
                    .catch(function(errorObject){
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
     * @param insertToken {boolean} - Whether to retrieve the token from the server if it doesn't exist. Defaults to true if not specified
     * @return {Promise} an initialized http request object.
     * @throws OpsviewAuthenticationError if the opsview rest api produced an error while authenticating while retrieving the token
     * @private
     */
    _buildOptionsFor(operation, endpoint, insertToken) {
        insertToken = insertToken || true;
        var result = null;

        let requestOptions = extend({}, operation);
        requestOptions.uri = self.opsviewHost + endpoint;
        if (this.token === null && insertToken) {
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
                    .catch(function (error) {
                        throw new OpsviewAuthenticationError(`The opsview authentication api throwed an error: ${error.message}`);
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
            let isOldWindows = process.platform === 'win32';
            let home = process.env[isOldWindows ? 'USERPROFILE' : 'HOME'];
            try {
                this.opsviewPropertiesFile = PropertiesReader(home + "/" + OPSVIEW_SECRET_FILE);
            } catch (error) { //Normalize file not found error
                throw new OpsviewPropertiesFileNotFoundError('The opsview properties file must exist in HOME/.opsview_secret');
            }
        }

        return this.opsviewPropertiesFile;
    }
}

let OPSVIEW_SECRET_FILE = '.opsview_secret';
let USERNAME_KEY = 'opsview.login.username';
let PASSWORD_KEY = 'opsview.login.password';
let OPSVIEW_HOST_KEY = 'opsview.host';
let OPSVIEW_HEADER_USERNAME = 'X-Opsview-Username';
let OPSVIEW_HEADER_TOKEN = 'X-Opsview-Token';

let JSON_HEADERS = {
    "Content-type": "application/json",
    "Accept": "application/json"
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
