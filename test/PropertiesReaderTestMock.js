"use strict";

/**
 *  A simple object that will return fake values for the testing of the opsview
 *  rest api server. An http server will be up at the local address 1234 port.
 */
exports.ValidPropertiesReaderMock = function(){
	return {
		get: function(key){
			let result = "";
			switch(key){
				case OPSVIEW_HOST_KEY:
					result = 'http://127.0.0.1:1234/rest';break;
				case USERNAME_KEY:
					result = 'validUsername';break;
				case PASSWORD_KEY:
					result = 'validPassword';break;
			}
			return result;
		}
	};
};
/**
 * Provides invalid credentials for the server.
 */
exports.InvalidPropertiesReaderMock = function(){
	return {
		get: function(key){
			let result = "";
			switch(key){
				case OPSVIEW_HOST_KEY:
					result = 'http://127.0.0.1:1234/rest';break;
				case USERNAME_KEY:
					result = 'invalidUsername';break;
				case PASSWORD_KEY:
					result = 'invalidPassword';break;
			}
			return result;
		}
	};
};


let OPSVIEW_HOST_KEY = 'opsview.host';
let USERNAME_KEY = 'opsview.login.username';
let PASSWORD_KEY = 'opsview.login.password';
