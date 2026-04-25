import { fetchJSON, renderProjects } from './global.js';

const projects = await fetchJSON('./lib/projects.json');

const latestProjects = projects.slice(0, 3);

const container = document.querySelector('.projects');

renderProjects(latestProjects, container, 'h2');

import { fetchGitHubData } from './global.js';

const githubData = await fetchGitHubData('raebybab');

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
  profileStats.innerHTML = `
    <dl>
      <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers:</dt><dd>${githubData.followers}</dd>
      <dt>Following:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}