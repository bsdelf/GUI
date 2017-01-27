'use strict';

const { User } = require('./github.js');

let user = new User('bsdelf');

user.getRepos()
    .then(repos => {
        console.log(JSON.stringify(repos, undefined, 4));
    })
    .catch(reason => {
        console.log(reason);
    });
