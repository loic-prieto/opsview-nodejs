'use strict';

/**
 * Thrown when the properties file for opsview doesn't exist.
 * It is a requirement of the library for this file to exist in
 * $HOME/.opsview_secret.
 */
class OpsviewPropertiesFileNotFoundError extends Error {
    constructor(message){
        super(message);
    }
}

/**
 * This exception is thrown while trying to authenticate with the
 * opsview REST API.
 */
class OpsviewAuthenticationError extends Error {
    constructor(message){
        super(message);
    }
}

/**
 * This is thrown when an interaction with the Opsview REST API
 * results in a server error.
 * Provides a detail attribute to inspect in greater detail the
 * error.
 */
class OpsviewApiError extends Error {
    /**
     * @constructor
     * @param opsviewApiError {object} - as returned by the API server.
     */
    constructor(opsviewApiError){
        super(opsviewApiError.message);
        this.detail = opsviewApiError.detail;
    }

    /**
     * Returns the detail of the API Error.
     * @return {string}
     */
    getDetail(){
        return this.detail;
    }
}

/**
 * Thrown when the user tries to instance an opsview object for a
 * version that is not implemented.
 */
class OpsviewVersionNotSupportedError extends Error {
    constructor(message){
        super(message);
    }
}

/**
 * Thrown when the user tries to call a method for which the opsview
 * version is not giving support.
 */
class OpsviewVersionDoesNotSupportMethodError extends Error {
    constructor(message){
        super(message);
    }
}

exports.OpsviewPropertiesFileNotFoundError = OpsviewPropertiesFileNotFoundError;
exports.OpsviewAuthenticationError = OpsviewAuthenticationError;
exports.OpsviewVersionNotSupportedError = OpsviewVersionNotSupportedError;
exports.OpsviewVersionDoesNotSupportMethodError = OpsviewVersionDoesNotSupportMethodError;
exports.OpsviewApiError = OpsviewApiError;