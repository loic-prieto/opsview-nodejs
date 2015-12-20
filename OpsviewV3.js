"use strict";

let Promise = require('bluebird');
let PropertiesReader = require('properties-reader');
let CredentialsNotFoundError = require('./exceptions').CredentialsNotFoundError;
let OpsviewPropertiesFileNotFoundError = require('./exceptions').OpsviewPropertiesFileNotFoundError;
let OpsviewAuthenticationError = require('./exceptions').OpsviewAuthenticationError;
let extend = require('util')._extend;

let http = require('request-promise');

/**
 * Main class to interact with opsview.
 * Opsview API version: 3.013
 */
class OpsviewV3 {
    constructor(){
        this.token = null;
        this.username = null;
        this.password = null;
        this.opsviewPropertiesFile = null;
        this.opsviewHost = null;
    }

    /**
     * Sets a downtime on a host or set of hosts
     * to a series of checks/services.
     * @return {Promise}
     */
    setDowntime(startTime,endTime,comment,hostPattern,servicesPattern){
        return new Promise(function(resolve,reject){
            let downtimeRequest = this._buildOptionsFor(REQUEST_OPTIONS.CREATE_DOWNTIME,ENDPOINTS.DOWNTIMES);
            downtimeRequest.uri += "?svc.hostname="+hostPattern;
            if(typeof servicesPattern !== "undefined"){
                downtimeRequest.uri += "&svc.servicename="+servicesPattern;
            }
        });
    }

    /**
     * Retrieves the credentials of the opsview user.
     * They should be put either in environmental letiables or
     * in a secret file $HOME/.opsview_secret
     *
     * Stores the result in the username and password attributes
     * of the instance.
     *
     * @private
     * @throws CredentialsNotFoundError when the credentials cannot be found.
     */
    _getCredentials(){
        let opsviewProperties = this._getOpsviewProperties();
        let username = opsviewProperties.get(USERNAME_KEY);
        let password = opsviewProperties.get(PASSWORD_KEY);

        // We can only provide these values by either of these two methods. If none are found,
        // then we must throw an exception
        if(typeof username === 'undefined') {
            throw new CredentialsNotFoundError('Could not retrieve credentials either from environment or from credential file');
        }

        this.username = username;
        this.password = password;
    }

    /**
     * Obtains a properties object from the opsview properties file that must exist
     * in $HOME/.opsview_secret
     * @returns {PropertiesReader}
     * @throws {OpsviewPropertiesFileNotFoundError} if the opsview file is not found
     * @private
     */
    _getOpsviewProperties(){
        if(this.opsviewPropertiesFile === null){
            let isWindows = process.platform === 'win32';
            let home = process.env[isWindows? 'USERPROFILE' : 'HOME'];
            try {
                let opsviewProperties = PropertiesReader(home+"/"+OPSVIEW_SECRET_FILE);
            } catch(error){ //Normalize file not found error
                throw new OpsviewPropertiesFileNotFoundError('The opsview properties file must existe in HOME/.opsview_secret');
            }
            this.opsviewPropertiesFile = opsviewProperties;
        }

        return this.opsviewPropertiesFile;
    }

    /**
     * Connects to the opsview API to obtain a token if it has no token.
     * @return {Promise}
     * @throws
     * @private
     */
    _getToken(){
        let self = this;
        return new Promise(function(resolve){
            if(self.username === null) {
                self._getCredentials();
            }
            if(self.token === null){
                self.opsviewHost = self._getOpsviewProperties().get(OPSVIEW_HOST_KEY)
            }

            let authenticationRequest = self._buildOptionsFor(REQUEST_OPTIONS.AUTHENTICATION,ENDPOINTS.AUTHENTICATION);
            authenticationRequest.body = {
                username:self.username,
                password:self.password
            };

            http(authenticationRequest)
                .then(function(response){
                    self.token = response.token;
                    resolve(self.token);
                })
                .catch(function(error){
                    throw new OpsviewAuthenticationError('The opsview authentication api throwed an error: '+error.message);
                });
        });
    }

    /**
     * Builds a request object for the http request method.
     * @param operation {string} - The operation to perform, selected from the REQUEST_OPTIONS enum.
     * @param endpoint {string} - the endpoint to reach, selected from the ENDPOINTS enum.
     * @return {object} an initialized http request object.
     * @private
     */
    _buildOptionsFor(operation,endpoint){
        let requestOptions = extend({},operation);
        requestOptions.uri = self.opsviewHost+endpoint;

        return requestOptions;
    }
}

let OPSVIEW_SECRET_FILE = '.opsview_secret';
let USERNAME_KEY = 'opsview.login.username';
let PASSWORD_KEY = 'opsview.login.password';
let OPSVIEW_HOST_KEY = 'opsview.host';

let JSON_HEADERS = {
    "Content-type":"application/json",
    "Accept":"application/json"
};

let REQUEST_OPTIONS = {
    AUTHENTICATION: {
        method:'POST',
        headers:JSON_HEADERS,
        json:true
    },
    CREATE_DOWNTIME: {
        method:'POST',
        headers:JSON_HEADERS,
        json:true
    }
};

let ENDPOINTS = {
    AUTHENTICATION: "/login",
    DOWNTIMES: '/downtime'
};

module.exports = OpsviewV3;