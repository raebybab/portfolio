let selectedIndex = -1;
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const container = document.querySelector('.projects');
renderProjects(projects, container, 'h2');

const title = document.querySelector('.projects-title');
title.textContent = `Projects (${projects.length})`;

function renderPieChart(projectsGiven) {
  let svg = d3.select('#projects-pie-plot');
  let legend = d3.select('.legend');

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  let rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let sliceGenerator = d3.pie().value(d => d.value);
  let arcData = sliceGenerator(data);
  let arcs = arcData.map(d => arcGenerator(d));
  
  arcs.forEach((arc, idx) => {
  svg.append('path')
    .attr('d', arc)
    .attr('fill', colors(idx))
    .attr('class', idx === selectedIndex ? 'selected' : '')
    .on('click', () => {
      selectedIndex = selectedIndex === idx ? -1 : idx;

      renderPieChart(projectsGiven);

      if (selectedIndex === -1) {
        renderProjects(projects, container, 'h2');
      } else {
        let selectedYear = data[idx].label;

        let filtered = projects.filter(p => p.year === selectedYear);

        renderProjects(filtered, container, 'h2');
      }
    });
});

  data.forEach((d, idx) => {
  legend.append('li')
    .attr('class', idx === selectedIndex ? 'selected' : '')
    .attr('style', `--color:${colors(idx)}`)
    .html(`
      <span class="swatch"></span>
      ${d.label} <em>(${d.value})</em>
    `)
    .on('click', () => {
      selectedIndex = selectedIndex === idx ? -1 : idx;

      renderPieChart(projectsGiven);

      if (selectedIndex === -1) {
        renderProjects(projects, container, 'h2');
      } else {
        let selectedYear = data[idx].label;

        let filtered = projects.filter(p => p.year === selectedYear);

        renderProjects(filtered, container, 'h2');
      }
    });
});

}

renderPieChart(projects);

let query = '';
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join(' ').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderProjects(filteredProjects, container, 'h2');
  renderPieChart(filteredProjects);
});