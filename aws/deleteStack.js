const AWS = require('./aws');

new AWS.cf.deleteStack('pomgraph').then(function (data) {
    console.log('delete stack request accepted:' + JSON.stringify(data));
});


