const AWS = require("./aws");
const _ = require("lodash");

new AWS.cf.list().then(function (stacks) {
    console.log('found ' + stacks.length  + ' stacks');
    _.each(stacks, function (stack) {
        console.log(stack);
    });
}).catch(function (asd) {
    console.log(asd);
});
