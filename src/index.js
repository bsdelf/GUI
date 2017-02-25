'use strict';

const fs = require('fs');
const { User } = require('./github.js');

let name = 'bsdelf';

new User(name)
    .getRepos()
    .then(repos => {
        let text = JSON.stringify(repos, undefined, 4)
        console.log(text);
        //fs.writeFileSync(`${name}.json`, text);
    })
    .catch(reason => {
        console.log('FATAL', reason);
    });
