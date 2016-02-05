Opsview NodeJS module
====================

Introduction
---------------------

The motivation of this module is to provide some of the basic functionality
of Opsview V3 in a nodejs classes module, instead of making api rest calls
directly with unirest or the like.

Since it's mainly an utility library for the greater project hubot-commands as
used in our company, I'm only implementing what we need in a most demanded basis, which
means that in the first release, only setting downtimes is working. For the next
one, I'm trying to push the reload configuration functionality.

Full documentation is in the code, on how to use the classes and each method, what
arguments are expected, what exceptions are thrown and what result objects are returned.

The code follows an asynchronous flow with Promises (from the Bluebird library).

Usage
----------------------
To prevent having to write credentials on a code file, the library will search for
credentials and the opsview server address in the following file:
*$HOME/.opsview_secret*
(In Windows it's %USERPROFILE% instead of %HOME% if it's a pre-Windows10 version).
This file is a properties file with the following keys:
- opsview.login.username
- opsview.login.password
- opsview.host

example:
```
opsview.login.username=username
opsview.login.password=password
opsview.host=http://www.monitoringserver.com/rest
```

If the file exists, then it is handled automatically by the library and you've only got to use it like so:

```
var Opsview = require('opsview-api');

var opsview = new Opsview(3); //Instances version 3

var from = new Date(2016,2,5,20,40);
var to = new Date(2016,2,5,20,59);
var comment = "NodeJS Opsview Library test";
var hostPattern = "backend.server%";
var servicePattern = "serviceName";

opsview.setDowntime(from,to,comment,hostPattern,servicePattern)
	.then(function(response){
		console.log("The downtime was set, yay!");
	})
	.catch(function(error){
		console.log(`Something terrible happened: ${error.message}`);
	});
```

The library was designed to support different versions of the API, even though only the V3 is likely to be 
implemented.

Merge requests are welcome.
