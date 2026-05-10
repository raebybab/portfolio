import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  return d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

let data = await loadData();
let commits = processCommits(data);

window.commits = commits;

// TOOLTIP
function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent =
    commit.datetime.toLocaleDateString();
  document.getElementById('commit-time').textContent =
    commit.datetime.toLocaleTimeString();
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(show) {
  document.getElementById('commit-tooltip').hidden = !show;
}

function updateTooltipPosition(event) {
  const t = document.getElementById('commit-tooltip');
  t.style.left = `${event.clientX + 10}px`;
  t.style.top = `${event.clientY + 10}px`;
}

// PROCESS COMMITS
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    let first = lines[0];

    let obj = {
      id: commit,
      url: 'https://github.com/YOUR_REPO/commit/' + commit,
      author: first.author,
      datetime: first.datetime,
      hourFrac:
        first.datetime.getHours() +
        first.datetime.getMinutes() / 60,
      totalLines: lines.length,
    };

    Object.defineProperty(obj, 'lines', {
      value: lines,
      enumerable: false,
    });

    return obj;
  });
}

// STATS
function renderCommitInfo(data, commits) {
  const c = d3.select('#stats');
  c.selectAll('*').remove();

  const dl = c.append('dl').attr('class', 'stats');

  dl.append('dt').text('Total LOC');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Files');
  dl.append('dd').text(d3.group(data, d => d.file).size);
}

// SELECTION SUMMARY
function renderSelectionSummary(selected) {
  const c = d3.select('#selection-summary');
  c.selectAll('*').remove();

  if (!selected.length) {
    c.append('p').text('No commits selected');
    return;
  }

  const total = d3.sum(selected, d => d.totalLines);
  const avg = d3.mean(selected, d => d.totalLines);

  c.append('p').text(`Selected: ${selected.length}`);
  c.append('p').text(`Total lines: ${total}`);
  c.append('p').text(`Avg lines: ${Math.round(avg || 0)}`);
}

// BREAKDOWN
function renderSelectionBreakdown(selected) {
  const c = d3.select('#selection-breakdown');
  c.selectAll('*').remove();

  if (!selected.length) {
    c.append('p').text('No breakdown available');
    return;
  }

  const byHour = d3.rollup(
    selected,
    v => v.length,
    d => Math.floor(d.hourFrac) % 24
  );

  const data = Array.from(byHour, ([hour, count]) => ({
    hour,
    count
  })).sort((a, b) => a.hour - b.hour);

  const width = 400;
  const height = 200;

  const svg = c.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.hour))
    .range([40, width - 10])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([height - 30, 10]);

  svg.append('g')
    .attr('transform', `translate(0,${height - 30})`)
    .call(d3.axisBottom(x));

  svg.append('g')
    .attr('transform', `translate(40,0)`)
    .call(d3.axisLeft(y));

  svg.selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', d => x(d.hour))
    .attr('y', d => y(d.count))
    .attr('width', x.bandwidth())
    .attr('height', d => y(0) - y(d.count))
    .attr('fill', 'orange');
}

// SCATTER
function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const x = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([40, width - 10]);

  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([height - 30, 10]);

  svg.append('g')
    .attr('transform', `translate(0,${height - 30})`)
    .call(d3.axisBottom(x));

  svg.append('g')
    .attr('transform', `translate(40,0)`)
    .call(
      d3.axisLeft(y)
  .tickFormat(d => `${String(d).padStart(2, '0')}:00`)
    );

  // TITLE
  svg.append('text')
  .attr('x', width / 2)
  .attr('y', 20)
  .attr('text-anchor', 'middle')
  .style('font-size', '14px')
  .text('Commits over Time vs Time of Day');

  const [minL, maxL] = d3.extent(commits, d => d.totalLines);

  const r = d3.scaleSqrt()
    .domain([minL, maxL])
    .range([2, 30]);

  const dots = svg.append('g');

  dots.selectAll('circle')
    .data(d3.sort(commits, d => -d.totalLines))
    .join('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.hourFrac))
    .attr('r', d => r(d.totalLines))
    .attr('fill', 'steelblue')
    .style('opacity', 0.7)
    .on('mouseenter', (e, d) => {
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(e);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', () => {
      updateTooltipVisibility(false);
    });

  // BRUSH
  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on('brush end', (event) => {
      const sel = event.selection;

      if (!sel) {
        dots.selectAll('circle')
          .classed('selected', false)
          .style('opacity', 0.7);

        renderSelectionSummary([]);
        renderSelectionBreakdown([]);
        return;
      }

      const selected = commits.filter(d => {
        const [[x0, y0], [x1, y1]] = sel;
        const px = x(d.datetime);
        const py = y(d.hourFrac);
        return x0 <= px && px <= x1 && y0 <= py && py <= y1;
      });

      dots.selectAll('circle')
        .classed('selected', d => selected.includes(d))
        .style('opacity', d => selected.includes(d) ? 1 : 0.15);

      renderSelectionSummary(selected);
      renderSelectionBreakdown(selected);
    });

  svg.append('g').call(brush);
}

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);