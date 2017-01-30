'use strict';

const url = require('url');
const request = require('request');
const cheerio = require('cheerio');

const TIMEOUT = 1000 * 5;

class User {
    constructor(user) {
        this._user = user;
    }

    getRepos() {
        return this.getRepoList()
            .then(value => {
                let { href, lst } = value;
                let promiseLst = lst.map(repo => {
                    let repoHref = url.resolve(href, repo.href);
                    return this.getRepoStats(repoHref, repo);
                })
                return Promise.all(promiseLst);
            });
    }

    getRepoList(href, lst) {
        if (!href) {
            href = `https://github.com/${this._user}?tab=repositories`;
        }

        if (!lst) {
            lst = [];
        }

        return get(href)
            .then(value => {
                let { href, body } = value;
                let $ = cheerio.load(body);
                
                $('#user-repositories-list')
                    .find('li')
                    .filter((_, el) => $(el).attr('itemprop') === 'owns')
                    .each((_, el) => {
                        let repo = Object.create(null);

                        repo.type = $(el).attr('class').split(' ').slice(-1)[0];

                        let name = $(el).find('a').filter((_, a) => $(a).attr('itemprop') === 'name codeRepository');
                        repo.href = name.attr('href');
                        repo.name = name.text().trim();

                        let desc = $(el).find('p').filter((_, p) => $(p).attr('itemprop') === 'description');
                        repo.desc = desc.text().trim();

                        let lang = $(el).find('span').filter((_, span) => $(span).attr('itemprop') === 'programmingLanguage');
                        repo.lang = lang.text().trim();

                        let updated = $(el).find('relative-time');
                        repo.updated = Date.parse(updated.attr('datetime'));

                        lst.push(repo);
                    });

                let next = $('.pagination').find('.next_page').attr('href');
                if (next) {
                    href = url.resolve(href, next);
                    return this.getRepoList(href, lst);
                }

                return { href, lst };
            });
    }

    getRepoStats(href, repo) {
        if (!repo.stats) {
            repo.stats = Object.create(null);
        }

        return get(href)
            .then(value => {
                let { href, body } = value;
                let $ = cheerio.load(body);

                $('.repository-lang-stats-numbers')
                    .children('li')
                    .each((_, el) => {
                        let lang = $('.lang', el).text().trim();
                        let percent = $('.percent', el).text().trim();
                        percent = percent.substr(0, percent.length - 1);
                        percent = Number.parseFloat(percent) / 100;
                        let color = $('.language-color', el).attr('style').split(':')[1];
                        if (!repo.stats.lang) {
                            repo.stats.lang = Object.create(null);
                        }
                        repo.stats.lang[lang] = { percent, color };
                    });

                $('.pagehead-actions')
                    .children('li')
                    .each((_, el) => {
                        let matched = $(el).text().trim().match(/(\w+)\s*(\d[\d,]*)/);
                        if (matched) {
                            let [ , name, count ] = matched;
                            count = Number.parseInt(count.replace(/,/g, ''));
                            repo.stats[name.toLowerCase()] = count;
                        }
                    });

                $('.numbers-summary')
                    .children('li')
                    .each((_, el) => {
                        let a = $('a', el);
                        let matched = a.text().trim().match(/(\d[\d,]*)\s*(\w+)/);
                        if (matched) {
                            let [ , count, name ] = matched;
                            count = Number.parseInt(count.replace(/,/g, ''));
                            repo.stats[name] = count;
                        }
                    });

                return repo;
            });
    }
};

function get(href) {
    return new Promise((resolve, reject) => {
        console.log('GET', href);
        let options = {
            uri: href,
            method: 'GET',
            timeout: TIMEOUT
        }
        request(options, (error, response, body) => {
            if (error) {
                return reject(error);
            }
            if (response.statusCode != 200) {
                return reject(response.statusCode);
            }
            console.log('>>>', href);
            resolve({ href, body });
        });
    });
}

module.exports = {
    User
};
