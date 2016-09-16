const q = require('q');
const _ = require('lodash');
var rq = q.denodeify(require('request'));
var xml2json = q.denodeify(require('xml2js').parseString);

function Artifact(group, id, version) {
    return {
        group: group,
        id: id,
        version: version
    }
}

function Database() {
    const AWS = require("aws-sdk");

    AWS.config.update({
        region: "us-west-2"
    });

    const docClient = new AWS.DynamoDB.DocumentClient();

    return {
        get: function (artifact) {
            console.log("looking for " + artifact.group + artifact.id + artifact.version);

            var deferred = q.defer();
            new AWS.DynamoDB().getItem({
                TableName: 'pomgraph',
                Key: {
                    ident: {
                        S: artifact.group + artifact.id + artifact.version
                    }
                }
            }, function (err, data) {
                if (err) {
                    console.log('error' + err);
                    deferred.reject(err);
                } else {
                    console.log('read' + JSON.stringify(data.Item));
                    deferred.resolve(data.Item);
                }
            });
            return deferred.promise;
        },
        add: function (artifact, dependencies) {
            var deferred = q.defer();

            const copy = _.clone(artifact);
            copy.ident = artifact.group + artifact.id + artifact.version;
            copy.dependencies = dependencies;
            console.log("adding " + JSON.stringify({
                    TableName: 'pomgraph',
                    Item: copy
                }));

            new AWS.DynamoDB.DocumentClient().put({
                TableName: 'pomgraph',
                Item: copy
            }, function (err, data) {
                if (err) {
                    console.log('error' + err);
                    deferred.reject(err);
                } else {
                    console.log('updated' + data);
                    deferred.resolve(data);
                }
            });

            return deferred.promise;
        }
    };
}

// new Database().get(new Artifact('bob', 'bob', 'bob')).then(console.log);

function parse(artifact, database) {

    function getDependencies(json) {
        console.log("getting dependencies");
        if (json.project.dependencies) {
            var value = _.chain(json.project.dependencies[0].dependency)
                .filter(function (dep) {
                    return dep.version && (dep.scope = 'provided' || !dep.scope);
                })
                .map(function (dependency) {
                    return new Artifact(dependency.groupId[0], dependency.artifactId[0], dependency.version[0]);
                })
                .value();
            console.log("got dependencies:" + value);
            return value;
        } else {
            return [];
        }
        // return q.allSettled(_.map(deps, function (dep) {
        //     return parse(dep.group, dep.artifact, dep.version);
        // }));
    }

    function graphDependencies(artifact) {
        return rq('https://repo1.maven.org/maven2/' + artifact.group.replace('.', '/') + '/' + artifact.id + '/' + artifact.version + '/' + artifact.id + '-' + artifact.version + '.pom')
            .then(function (data) {
                console.log('from maven, got: ' + data[0].statusCode);
                if (data[0].statusCode == 200) {
                    return xml2json(data[1])
                        .then(getDependencies)
                        .then(function (deps) {
                            return database.add(artifact, deps);
                        });
                }
            });
    }

    return database.get(artifact)
        .then(function (data) {
            if (!data) {
                return graphDependencies(artifact);
            } else {
                console.log("skipping as we already have this");
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

// const database = new Database();
var artifact = new Artifact('io.fintrospect', 'fintrospect-core_2.11', '13.8.1');

// database.get(artifact).then(console.log);

exports.handler(artifact);