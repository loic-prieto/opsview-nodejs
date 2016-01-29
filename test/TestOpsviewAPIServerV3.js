"use strict";

var express = require('express');
var bodyParser = require('body-parser');

/**
 * A test Opsview API Server to be used by the opsview library tests.
 */
class TestOpsviewAPIServerV3 {
    constructor(){
        this.app = express();
        this.app.use(bodyParser.json());
        this._setupLoginEndpoint();
        this._setupDowntimesEndpoint();
		this._setupReloadEndpoint();
    }

    start(doneFn){
        this.server = this.app.listen(1234,doneFn);
    }

    stop(){
        this.server.close();
    }

    _setupLoginEndpoint(){
        this.app.post('/login',function(req,res){
            let body = req.body;
            let validCredentials = body.username == VALID_USERNAME && body.password == VALID_PASSWORD;

            if(validCredentials) {
                res.status(200)
                   .type('json')
                   .send({token:VALID_TOKEN});
            } else {
                res.status(401)
                   .type('json')
                   .send({message:'invalid credentials'});
            }
        });
    }

    _setupDowntimesEndpoint(){
        let self = this;
        this.app.post('/downtime',function(req,res){
            if(self._validHeaders(req)){
                let servicePattern = req.query['svc.servicename'];
                let hostPattern = req.query['svc.hostname'];
                let downtimeParams = req.body;

                //Will only set downtimes on host host1.tests.com for service check_http
                if(hostPattern == 'host1.tests.com') {
                    if(servicePattern == 'check_http'){
                        res.status(200)
                           .type('json')
                           .send({
                               summary:{
                                   num_hostgroups:1,
                                   num_hosts:1,
                                   num_services:1
                               },
                               list:{
                                   hostgroups:[{id:1,name:'hostgroup1'}],
                                   hosts:[{id:1,hostname:'host1'}],
                                   services:[{id:1,hostname:'host1',servicename:'check_http'}]
                               }
                           });
                    } else {
                        res.status(404)
                           .type('json')
                           .send({message:`The service ${servicePattern} was not found`});
                    }
                } else {
                    res.status(404)
                       .type('json')
                       .send({message:`The host ${hostPattern} was not found`});
                }
            } else {
                res.status(401)
                   .type('json')
                   .send({'message':'credentials are needed to make a petition.'});
            }
        });
    }

	_setupReloadEndpoint(){
		let self = this;
		this.app.post('/reload',function(req,res){
			if(self._validHeaders(req)){
				res.status(200)
			       .type(json)
			       .send({
					   server_status:0,
					   configuration_status:"uptodate",
					   average_duration:1200,
					   lastupdated:0,
					   messages:[]
				   });
			} else {
				res.status(401)
                   .type('json')
                   .send({'message':'credentials are needed to make a petition.'});
			}
			
		});
	}

    /**
     * Checks whether the headers have valid credentials.
     * Must be (literally):
     *   X-Opsview-Username: validUsername,
     *   X-Opsview-Token: validToken,
     * @param req {object} - the request object
     * @returns {boolean} true if they are
     * @private
     */
    _validHeaders(req){
        let username = req.get('X-Opsview-Username');
        let token = req.get('X-Opsview-Token');

        let definedHeaders = typeof username !== 'undefined' && typeof token !== 'undefined';

        return definedHeaders && username == VALID_USERNAME && token == VALID_TOKEN;
    }
}

module.exports = TestOpsviewAPIServerV3;

var VALID_USERNAME = 'validUsername';
var VALID_TOKEN = 'validToken';
var VALID_PASSWORD = 'validPassword';
