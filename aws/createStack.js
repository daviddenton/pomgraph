const q = require('q');
const AWS = require('./aws');
const getIp = q.denodeify(require('external-ip')());

getIp()
    .then(function (ip) {
        return AWS.cf.createStack('pomgraph', ip)
    })
    .then(function (data) {
        console.log('created: ' + data.Stacks[0].StackId);
        console.log('ssh: ' + data.Stacks[0].Outputs[0].OutputValue);
    })
    .catch(function (err) {
        console.log('error', err);
    });

