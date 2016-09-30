const q = require('q');
const _ = require('lodash');
const rq = q.denodeify(require('request'));
const xml2json = q.denodeify(require('xml2js').parseString);
const AWS = require("aws-sdk");

AWS.config.setPromisesDependency(q);
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
            var key = artifact.group + artifact.id + artifact.version;
            return new AWS.DynamoDB().getItem({
                TableName: 'pomgraph',
                Key: {
                    ident: {
                        S: key
                    }
                }
            }).promise().then(function (data) {
                console.log('read ' + key + ' ' + JSON.stringify(data.Item));
                return data.Item;
            });
        },
        add: function (artifact, dependencies) {
            const copy = _.clone(artifact);
            copy.ident = artifact.group + artifact.id + artifact.version;
            copy.dependencies = dependencies;
            console.log("adding " + JSON.stringify(copy));

            return new AWS.DynamoDB.DocumentClient().put({
                TableName: 'pomgraph',
                Item: copy
            }).promise()
                .then(function (data) {
                    console.log('added to database' + artifact);
                    return data;
                })
                .catch(function (err) {
                    console.log('error adding artifact ' + copy.ident + ' - ' + err);
                    throw err
                });
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
                                const payload = JSON.stringify(dep);
                                return new AWS.Lambda({
                                    region: "us-west-2"
                                }).invoke({
                                    FunctionName: 'pomgraph',
                                    Payload: payload
                                }).promise()
                                    .then(function (data) {
                                        console.log('queued ' + payload);
                                        return data;
                                    });
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

    parse(JSON.parse(event.Records[0].Sns.Message), database)
        .then(function (result) {
            context.succeed(result);
        })
        .catch(function (e) {
            console.log(e);
            context.succeed(e);
        });
};
