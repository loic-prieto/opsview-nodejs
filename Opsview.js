var Promise = require('bluebird');
var PropertiesReader = require('properties-reader');
var CredentialsNotFoundError = require('./exceptions').CredentialsNotFoundError;
var OpsviewPropertiesFileNotFoundError = require('./exceptions').OpsviewPropertiesFileNotFoundError;
var OpsviewAuthenticationError = require('./exceptions').OpsviewAuthenticationError;
var extend = require('util')._extend;

var http = require('request-promise');

/**
 * Main class to interact with opsview.
 * Opsview API version: 3.013
 */
class Opsview {
    constructor(opsviewEndpoint){
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
            var downtimeRequest = this._buildOptionsFor(REQUEST_OPTIONS.CREATE_DOWNTIME,ENDPOINTS.DOWNTIMES);
            downtimeRequest.uri += "?svc.hostname="+hostPattern;
            if(typeof servicesPattern !== "undefined"){
                downtimeRequest.uri += "&svc.servicename="+servicesPattern;
            }
        });
    }

    /**
     * Retrieves the credentials of the opsview user.
     * They should be put either in environmental variables or
     * in a secret file $HOME/.opsview_secret
     *
     * Stores the result in the username and password attributes
     * of the instance.
     *
     * @private
     * @throws CredentialsNotFoundError when the credentials cannot be found.
     */
    _getCredentials(){
        var opsviewProperties = this._getOpsviewProperties();
        username = opsviewProperties.get(USERNAME_KEY);
        password = opsviewProperties.get(PASSWORD_KEY);

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
        var self = this;
        return new Promise(function(resolve,reject){
            if(self.username === null) {
                self._getCredentials();
            }
            if(self.token === null){
                self.opsviewHost = self._getOpsviewProperties().get(OPSVIEW_HOST_KEY)
            }

            var authenticationRequest = self._buildOptionsFor(REQUEST_OPTIONS.AUTHENTICATION,ENDPOINTS.AUTHENTICATION);
            authenticationRequest.body = {
                username:self.username,
                password:self.password
            }

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
     * @param operation
     * @param endpoint
     * @private
     */
    _buildOptionsFor(operation,endpoint){
        var requestOptions = extend({},operation);
        requestOptions.uri = self.opsviewHost+endpoint;

        return requestOptions;
    }
}

var OPSVIEW_SECRET_FILE = '.opsview_secret';
var USERNAME_KEY = 'opsview.login.username';
var PASSWORD_KEY = 'opsview.login.password';
var OPSVIEW_HOST_KEY = 'opsview.host';

var ENDPOINTS = {
    AUTHENTICATION: "/login",
    DOWNTIMES: '/downtime'
};

var REQUEST_OPTIONS = {
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

var JSON_HEADERS = {
    "Content-type":"application/json",
    "Accept":"application/json"
};