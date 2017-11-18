import url from 'url';
import cheerio from 'cheerio';
import request from 'request-promise-native';

const TIMEOUT = 1000 * 5;

export async function fetchPage(href, maxTrial = 10) {
    const options = {
        uri: href,
        method: 'GET',
        timeout: TIMEOUT
    };
    for (let iTrial = 1; iTrial <= maxTrial; ++iTrial) {
        try {
            console.log('GET', href);
            return await request(options);
        } catch (err) {
            console.log(err);
            console.log(`Failed to fetch ${href}, trial: ${iTrial}/${maxTrial}`);
        }
    }
    throw new Error('Hit max trial');
}

export async function fetchRepos(user) {
    const lst = [];
    let href = `https://github.com/${user}?tab=repositories`;
    do {
        const body = await fetchPage(href);
        const $ = cheerio.load(body);
        $('#user-repositories-list')
            .find('li')
            .each((_, el) => {
                if ($(el).attr('itemprop') !== 'owns') {
                    return;
                }
                const repo = {};
                repo.type = $(el).attr('class').split(' ').slice(-1)[0];
                const name = $(el).find('a').filter((_, a) => $(a).attr('itemprop') === 'name codeRepository');
                repo.href = url.resolve(href, name.attr('href'));
                repo.name = name.text().trim();
                const forked = name.parent().next();
                if (forked.text().trim().startsWith('Forked from')) {
                    repo.upstream = url.resolve(href, forked.find('a').attr('href'));
                }
                const desc = $(el).find('p').filter((_, p) => $(p).attr('itemprop') === 'description');
                repo.desc = desc.text().trim();
                const lang = $(el).find('span').filter((_, span) => $(span).attr('itemprop') === 'programmingLanguage');
                repo.lang = lang.text().trim();
                const updated = $(el).find('relative-time');
                repo.updated = Date.parse(updated.attr('datetime'));
                lst.push(repo);
            });
        const next = $('.pagination').find('.next_page').attr('href');
        href = next ? url.resolve(href, next) : null;
    } while (href);
    return lst;
}

async function fetchConnection(user, tab) {
    const connection = [];
    for (let page = 1; ; ++page) {
        const href = `https://github.com/${user}?tab=${tab}&page=${page}`;
        const body = await fetchPage(href);
        const $ = cheerio.load(body);
        const items = $('#js-pjax-container .position-relative')
            .find('.d-table-cell.col-9.v-align-top.pr-3')
        if (items.length < 1) {
            break;
        }
        items.each((_, el) => {
            const spans = $('span', el);
            const name = $(spans[0]).text();
            const id = $(spans[1]).text();
            let organization = null;
            let location = null;
            $('.octicon', el)
                .each((_, el) => {
                    const parents = $(el).parents('.mr-3');
                    if (parents.length === 1) {
                        organization = $(parents[0]).text().trim();
                    } else {
                        location = $(el)
                            .parent().contents()
                            .filter((_, node) => node.nodeType === 3)
                            .text().trim();
                    }
                });
            connection.push({
                name,
                id,
                organization,
                location
            });
        });
    }
    return connection;
}

export async function fetchFollowers(user) {
    return fetchConnection(user, 'followers');
}

export async function fetchFollowing(user) {
    return fetchConnection(user, 'following');
}

export async function fetchRepoStats(href) {
    const stats = {};
    const body = await fetchPage(href);
    const $ = cheerio.load(body);
    $('.repository-lang-stats-numbers')
        .children('li')
        .each((_, el) => {
            let lang = $('.lang', el).text().trim();
            let percent = $('.percent', el).text().trim();
            percent = percent.substr(0, percent.length - 1);
            percent = Number.parseFloat(percent) / 100;
            let color = $('.language-color', el).attr('style').split(':')[1];
            if (!stats.lang) {
                stats.lang = Object.create(null);
            }
            stats.lang[lang] = { percent, color };
        });
    $('.pagehead-actions')
        .children('li')
        .each((_, el) => {
            let matched = $(el).text().trim().match(/(\w+)\s*(\d[\d,]*)/);
            if (matched) {
                let [ , name, count ] = matched;
                count = Number.parseInt(count.replace(/,/g, ''));
                stats[name.toLowerCase()] = count;
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
                stats[name] = count;
            }
        });
    return stats;
}

export default {
    fetchPage,
    fetchRepos,
    fetchFollowers,
    fetchFollowing,
    fetchRepoStats
};
