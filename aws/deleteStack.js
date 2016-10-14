const AWS = require('./aws');

new AWS.cf.deleteStack('pomgraph').then(function (data) {
    console.log('ok??:' + JSON.stringify(data));
});


