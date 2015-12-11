'use strict';

var PropertiesReader = require('properties-reader');

//Get the opsview login variables from the environment
let OPSVIEW_LOGIN = process.env.OPSVIEW_USERNAME;
let OPSVIEW_PASSWORD = process.env.OPSVIEW_PASSWORD;

//If undefined, then get the variables from a file in home ($HOME/.opsview_secret)
if(typeof OPSVIEW_LOGIN === 'undefined'){
    let isWindows = process.platform === 'win32';
    let HOME = process.env[isWindows? 'USERPROFILE' : 'HOME'];
    var opsviewProperties = PropertiesReader(HOME+"/.hubot_secret");
    OPSVIEW_LOGIN = opsviewProperties.get('opsview.login.username');
    OPSVIEW_PASSWORD = opsviewProperties.get('opsview.login.password');
}

console.log("Login: "+OPSVIEW_LOGIN);
console.log("Password: "+OPSVIEW_PASSWORD);
