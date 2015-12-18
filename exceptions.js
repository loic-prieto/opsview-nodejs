'use strict';

/**
 * When interacting with the opsview server, we need credentials.
 * The idea is to provide them either via environmental variables:
 *   - OPSVIEW_USERNAME
 *   - OPSVIEW_PASSWORD
 * or via a credentials file which is $HOME/.opsview_secret.
 * If the credentials are stored in the credential files, it must be a
 * properties file with the following key-values:
 *   - opsview.login.username=user name
 *   - opsview.login.password=password
 * The code should never have hardcoded these values.
 */
class CredentialsNotFoundError extends Error {
    constructor(message){
        super(message);
    }
}

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

exports.CredentialsNotFoundError = CredentialsNotFoundError;
exports.OpsviewPropertiesFileNotFoundError = OpsviewPropertiesFileNotFoundError;
exports.OpsviewAuthenticationError = OpsviewAuthenticationError;
