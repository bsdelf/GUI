import 'source-map-support/register';
import fs from 'fs';
import GitHub from './github';

async function main() {
    const name = 'bsdelf';
    const repos = await GitHub.fetchRepos(name);
    console.log(repos);
    for (const repo of repos) {
        const stats = await GitHub.fetchRepoStats(repo.href);
        console.log(stats);
    }
}

(async () => {
    try {
        await main();
    } catch (err) {
        console.log(err);
    }
})();

