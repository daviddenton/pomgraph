const q = require('q');
const _ = require('lodash');
const rq = q.denodeify(require('request'));
const xml2json = q.denodeify(require('xml2js').parseString);
const AWS = require("aws-sdk");

AWS.config.update({
    region: "us-west-2"
});

function Artifact(group, id, version) {
    return {
        group: group,
        id: id,
        version: version
    }
}

function Database() {
    return {
        get: function (artifact) {
            var deferred = q.defer();
            var key = artifact.group + artifact.id + artifact.version;
            new AWS.DynamoDB().getItem({
                TableName: 'pomgraph',
                Key: {
                    ident: {
                        S: key
                    }
                }
            }, function (err, data) {
                if (err) {
                    console.log('error getting artifact ' + key + ' - ',  err);
                    deferred.reject(err);
                } else {
                    console.log('read ' + key + ' ' + JSON.stringify(data.Item));
                    deferred.resolve(data.Item);
                }
            });
            return deferred.promise;
        },
        add: function (artifact, dependencies) {
            const deferred = q.defer();

            const copy = _.clone(artifact);
            copy.ident = artifact.group + artifact.id + artifact.version;
            copy.dependencies = dependencies;
            console.log("adding " + JSON.stringify(copy));

            new AWS.DynamoDB.DocumentClient().put({
                TableName: 'pomgraph',
                Item: copy
            }, function (err, data) {
                if (err) {
                    console.log('error adding artifact ' + err);
                    deferred.reject(err);
                } else {
                    console.log('added to database' + artifact);
                    deferred.resolve(data);
                }
            });

            return deferred.promise;
        }
    };
}

function parse(artifact, database) {

    function getDependencies(json) {
        if (json.project.dependencies) {
            return _.chain(json.project.dependencies[0].dependency)
                .filter(function (dep) {
                    return dep.version && (dep.scope = 'provided' || !dep.scope);
                })
                .map(function (dependency) {
                    return new Artifact(dependency.groupId[0], dependency.artifactId[0], dependency.version[0]);
                })
                .value();
        } else {
            return [];
        }
    }

    function graphDependencies(artifact) {
        return rq('https://repo1.maven.org/maven2/' + artifact.group.replace('.', '/') + '/' + artifact.id + '/' + artifact.version + '/' + artifact.id + '-' + artifact.version + '.pom')
            .then(function (data) {
                console.log('from maven, got: ' + data[0].statusCode);
                if (data[0].statusCode == 200) {
                    return xml2json(data[1])
                        .then(getDependencies)
                        .then(function (deps) {
                            return q.allSettled(_.map(deps, function (dep) {
                                const deferred = q.defer();
                                const payload = JSON.stringify(dep);
                                new AWS.Lambda({
                                    region: "us-west-2"
                                }).invoke({
                                    FunctionName: 'pomgraph',
                                    Payload: payload
                                }, function (err) {
                                    if (err) {
                                        console.log('error sending' + payload, err);
                                        deferred.reject(err);
                                    } else {
                                        console.log('queued' + payload);
                                        deferred.resolve(dep);
                                    }
                                });

                                return deferred.promise;
                            }))
                                .then(function () {
                                    return database.add(artifact, deps);
                                });
                        });
                }
            });
    }

    return database.get(artifact)
        .then(function (data) {
            if (!data) {
                return graphDependencies(artifact);
            } else {
                return "skipping as we already have this";
            }
        });
}

exports.handler = function (event, context) {
    const database = new Database();

    parse(event, database)
        .then(function (result) {
            context.succeed(result);
        })
        .catch(function (e) {
            context.succeed(e);
        });
};
var artifact = new Artifact('io.fintrospect', 'fintrospect-core_2.11', '13.8.1');
exports.handler(artifact);