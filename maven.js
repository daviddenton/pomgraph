const q = require('q');
const _ = require('lodash');
var rq = q.denodeify(require('request'));
var xml2json = q.denodeify(require('xml2js').parseString);

function Artifact(group, artifact, version) {
    return {
        group: group,
        artifact: artifact,
        version: version,
        key: function () {
            return group + artifact + version;
        },
        pom: function () {
            return 'https://repo1.maven.org/maven2/' + group.replace('.', '/') + '/' + artifact + '/' + version + '/' + artifact + '-' + version + '.pom';
        }
    }
}

function Database() {
    const done = {};

    return {
        state: function () {
            return _.mapValues(done, function (deps) {
                return _.map(deps, function (dep) {
                    return dep.key();
                })
            });
        },
        get: function (artifact) {
            return done[artifact.key()];
        },
        add: function (artifact, dependencies) {
            done[artifact.key()] = dependencies;
        }
    };
}

const database = new Database();

function parse(group, artifactId, version) {
    const artifact = new Artifact(group, artifactId, version);

    if (!database.get(artifact)) {
        return rq(artifact.pom())
            .then(function (data) {
                if (data[0].statusCode == 200) {
                    return xml2json(data[1])
                        .then(function (json) {
                            if (!json.project.dependencies) {
                                return;
                            }
                            const deps = _.chain(json.project.dependencies[0].dependency)
                                .filter(function (dep) {
                                    return dep.version && (dep.scope = 'provided' || !dep.scope);
                                })
                                .map(function (dependency) {
                                    return new Artifact(dependency.groupId[0], dependency.artifactId[0], dependency.version[0]);
                                })
                                .value();
                            database.add(artifact, deps);

                            return q.allSettled(_.map(deps, function (dep) {
                                return parse(dep.group, dep.artifact, dep.version);
                            }));
                        })
                }
            })
            .catch(function () {
                console.log('error:' + url);
            });
    }
}

const group = 'io.fintrospect';
const artifact = 'fintrospect-core_2.11';
const version = '13.8.1';

parse(group, artifact, version).then(function () {
    console.log(database.state());
});




