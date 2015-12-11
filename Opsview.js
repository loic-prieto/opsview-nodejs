var Promise = require('bluebird');
var PropertiesReader = require('properties-reader');
var CredentialsNotFoundError = require('./exceptions').CredentialsNotFoundError;

/**
 * Main class to interact with opsview.
 */
class Opsview {
    constructor(opsviewEndpoint){
        this.token = null;
        this._getCredentials();
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
        //First look in environmental variables
        let username = process.env.OPSVIEW_USERNAME;
        let password = process.env.OPSVIEW_PASSWORD;

        //Then if there is no variable, then look on the default secret file
        if(typeof username === 'undefined'){
            let isWindows = process.platform === 'win32';
            let home = process.env[isWindows? 'USERPROFILE' : 'HOME'];
            let opsviewProperties = PropertiesReader(home+"/"+OPSVIEW_SECRET_FILE);
            username = opsviewProperties.get(USERNAME_KEY);
            password = opsviewProperties.get(PASSWORD_KEY);
        }

        // We can only provide these values by either of these two methods. If none are found,
        // then we must throw an exception
        if(typeof username === 'undefined') {
            throw new CredentialsNotFoundError('Could not retrieve credentials either from environment or from credential file');
        }

        this.username = username;
        this.password = password;
    }
}

var OPSVIEW_SECRET_FILE = '.hubot_secret';
var USERNAME_KEY = 'opsview.login.username';
var PASSWORD_KEY = 'opsview.login.password';