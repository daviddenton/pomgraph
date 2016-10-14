const q = require('q');
const AWS = require("aws-sdk");

AWS.config.setPromisesDependency(q.Promise);
AWS.config.update({
    region: "us-west-2"
});

const cloudformation = new AWS.CloudFormation();

function convert(f, p) {
    const deferred = q.defer();
    f(p, function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}

function Parameter(key, value) {
    return {
        ParameterKey: key,
        ParameterValue: value,
        UsePreviousValue: false
    };
}

module.exports = {
    cf: {
        createStack: function (name, ip) {
            var params = {
                StackName: name,
                Capabilities: ['CAPABILITY_IAM'],
                NotificationARNs: [],
                OnFailure: 'DELETE',
                Parameters: [Parameter('GremlinServerPort', '8182'), Parameter('InstanceType', 't2.small'), Parameter('KeyName', 'aws'), Parameter('SSHLocation', ip + '/32'), Parameter('StorageBackendPropertiesFileS3Url', 'https://s3-us-west-2.amazonaws.com/pomgraph/dynamodb.properties'), Parameter('SubnetRange', '10.0.0.0/24'), Parameter('TitanInstanceProfilePath', '/'), Parameter('TitanInstanceProfileRole', 'pomgraph-backend'), Parameter('VPCRange', '10.0.0.0/16')],
                Tags: [{
                    Key: 'name',
                    Value: name
                }],
                TemplateURL: 'https://s3-us-west-2.amazonaws.com/pomgraph/dynamodb-titan-storage-backend-cfn.json',
                TimeoutInMinutes: 5
            };

            return cloudformation.createStack(params)
                .promise()
                .then(function (data) {
                    return cloudformation.waitFor('stackCreateComplete', {StackName: data.StackId})
                        .promise()
                });
        },
        deleteStack: function (name) {
            return cloudformation.deleteStack({StackName: name})
                .promise();
        },
        list: function () {
            return cloudformation.listStacks({
                StackStatusFilter: ['CREATE_COMPLETE']
            })
                .promise()
                .then(function (data) {
                    return data.StackSummaries;
                });
        }
    }
};