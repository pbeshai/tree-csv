let csvData;
let rootNode;
let idKey = 'Source';
let parentKey = 'Target';
let colorKey = 'Emotion';
let specialKey = 'Is_Influencer';
const specialSizeFactor = 1.6;
let colorScale = d3.scaleOrdinal();
let highlightNode = null;

const queryParams = window.location.search
  .substring(1)
  .split('&')
  .filter(d => d !== '')
  .reduce((params, param) => {
    const entry = param.split('=');
    params[entry[0]] = entry[1];
    return params;
  }, {});

const width = queryParams.width ? +queryParams.width : 800;
const height = queryParams.height ? +queryParams.height : 800;

// padding around the chart where axes will go
const padding = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
};

// inner chart dimensions, where the dots are plotted
const plotAreaWidth = width - padding.left - padding.right;
const plotAreaHeight = height - padding.top - padding.bottom;

// radius of points in the scatterplot
const pointRadius = 5;

// select the root container where the chart will be added
const rootContainer = d3.select('#root');

function render() {
  renderControls();
  renderLegend();
  renderTree();
  renderHighlight();
}

function renderControls() {
  console.log('render controls');
  d3.select('#read-csv-btn').on('click', () => {
    treeFromCsvTextArea();
    render();
  });
}

function isSpecial(d) {
  return !!d[specialKey] && d[specialKey] !== '0';
}

function renderHighlight() {
  const highlightContainer = rootContainer
    .select('.highlight-container')
    .empty()
    ? rootContainer
        .select('.vis-container')
        .append('div')
        .attr('class', 'highlight-container')
    : rootContainer.select('.highlight-container');

  if (!highlightNode) {
    highlightContainer.style('display', 'none');
    return;
  }
  const { data } = highlightNode;
  const highlightRowHtml = Object.keys(data)
    .map(
      key =>
        `<tr><td class='key'>${key}</td><td class='value'>${data[key]}${key ===
        colorKey
          ? `<span class='color-swatch' style='background: ${colorScale(
              data[key]
            )}'></span>`
          : ''}</td></tr>`
    )
    .join('');

  highlightContainer
    .style('display', '')
    .html(
      `<table class='node-table'><tbody>${highlightRowHtml}</tbody></table>`
    );

  const {
    width: hWidth,
    height: hHeight,
  } = highlightContainer.node().getBoundingClientRect();

  let { x, y } = highlightNode;
  x += padding.left;
  y += padding.top;
  const hMargin = 5;

  if (y + hHeight > height) {
    y -= hHeight;
    y -= hMargin;
  } else {
    y += hMargin;
  }

  if (x + hWidth > width) {
    x -= hWidth;
    x -= hMargin;
  } else {
    x += hMargin;
  }

  console.log(highlightNode, x, y);
  highlightContainer.style('transform', `translate(${x}px, ${y}px)`);
}

function renderLegend() {
  /** Legend */
  const legendContainer = rootContainer.select('.legend').empty()
    ? rootContainer.append('div').attr('class', 'legend')
    : rootContainer.select('.legend');

  const legendBinding = legendContainer
    .selectAll('.legend-item')
    .data(colorScale.domain());
  legendBinding.exit().remove();
  const legendEntering = legendBinding
    .enter()
    .append('span')
    .attr('class', 'legend-item')
    .html(' tessssst');
  legendEntering
    .merge(legendBinding)
    .html(
      d =>
        `<span class='legend-swatch' style='background: ${colorScale(
          d
        )}'></span><span class='legend-item-label'>${d}</span> `
    );
}

function renderTree() {
  console.log('render svg with rootNode', rootNode);
  // rootContainer.select('svg').remove();
  const nodes = rootNode ? rootNode.descendants() : [];
  const links = rootNode ? rootNode.links() : [];
  console.log('render svg with nodes', nodes);
  console.log('render svg with links', links);

  // initialize main SVG
  const svg = rootContainer.select('svg').empty()
    ? rootContainer
        .select('.vis-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
    : rootContainer.select('svg');

  // the main <g> where all the chart content goes inside
  const g = svg.select('.root-g').empty()
    ? svg
        .append('g')
        .attr('class', 'root-g')
        .attr(
          'transform',
          'translate(' + padding.left + ' ' + padding.top + ')'
        )
    : svg.select('.root-g');

  const gLinks = g.select('.links').empty()
    ? g.append('g').attr('class', 'links')
    : g.select('.links');
  const gNodes = g.select('.nodes').empty()
    ? g.append('g').attr('class', 'nodes')
    : g.select('.nodes');

  // const highlightLabel = g.select('.highlight-label').empty()
  //   ? g
  //       .append('text')
  //       .attr('class', 'highlight-label')
  //       .attr('text-anchor', 'middle')
  //       .attr('dy', pointRadius + 18)
  //       .style('font-weight', '600')
  //       .style('pointer-events', 'none')
  //   : g.select('.highlight-label');

  // render nodes
  const nodesBinding = gNodes.selectAll('.node').data(nodes, d => d[idKey]);
  nodesBinding.exit().remove();
  const nodesEnter = nodesBinding
    .enter()
    .append('circle')
    .attr('class', 'node')
    .attr('r', pointRadius)
    .attr('transform', d => `translate(${d.x} ${d.y})`)
    .on('mouseenter', function(d) {
      // highlightLabel
      //   .attr('transform', `translate(${d.x} ${d.y})`)
      //   .text(JSON.stringify(d.data));
      highlightNode = d;
      renderHighlight();
      d3.select(this).classed('highlighted', true);
    })
    .on('mouseleave', function() {
      // highlightLabel.text('');
      highlightNode = null;
      renderHighlight();
      d3.select(this).classed('highlighted', false);
    });

  nodesEnter
    .merge(nodesBinding)
    .classed('special', d => isSpecial(d.data))
    .attr(
      'r',
      d => (isSpecial(d.data) ? specialSizeFactor * pointRadius : pointRadius)
    )
    .attr('transform', d => `translate(${d.x} ${d.y})`)
    .style('fill', d => colorScale(d.data[colorKey]));

  // render links
  const linksBinding = gLinks
    .selectAll('.link')
    .data(links, d => `${d.source[idKey]}--${d.target[idKey]}`);
  linksBinding.exit().remove();

  const linksEnter = linksBinding
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);

  linksEnter
    .merge(linksBinding)
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y)
    .style('stroke', d => colorScale(d.target.data[colorKey]));
}

function treeFromCsvTextArea() {
  const text = d3.select('#csv-text-input').property('value');
  csvData = d3.csvParse(text);

  try {
    const stratifier = d3
      .stratify()
      .id(d => d[idKey])
      .parentId(d => d[parentKey]);
    rootNode = stratifier(csvData);
  } catch (e) {
    alert('Error occurred making tree: ' + e);
  }

  // run tree layout
  const tree = d3.tree().size([plotAreaWidth, plotAreaHeight]);
  tree(rootNode);

  console.log('got csvData =', csvData);
  console.log('got rootNode =', rootNode);
  console.log(idKey);

  // update the column selects
  d3
    .select('#id-key-select')
    .on('change', function() {
      idKey = this.value;
      treeFromCsvTextArea();
      render();
    })
    .selectAll('option')
    .data(csvData.columns)
    .enter()
    .append('option')
    .property('value', d => d)
    .text(d => d);
  d3.select('#id-key-select').property('value', idKey);

  d3
    .select('#parent-key-select')
    .on('change', function() {
      parentKey = this.value;
      treeFromCsvTextArea();
      render();
    })
    .selectAll('option')
    .data(csvData.columns)
    .enter()
    .append('option')
    .property('value', d => d)
    .text(d => d);
  d3.select('#parent-key-select').property('value', parentKey);

  d3
    .select('#color-key-select')
    .on('change', function() {
      colorKey = this.value;
      treeFromCsvTextArea();
      render();
    })
    .selectAll('option')
    .data(csvData.columns)
    .enter()
    .append('option')
    .property('value', d => d)
    .text(d => d);
  d3.select('#color-key-select').property('value', colorKey);

  d3
    .select('#special-key-select')
    .on('change', function() {
      specialKey = this.value;
      treeFromCsvTextArea();
      render();
    })
    .selectAll('option')
    .data(csvData.columns)
    .enter()
    .append('option')
    .property('value', d => d)
    .text(d => d);
  d3.select('#special-key-select').property('value', specialKey);

  const colorDomain = rootNode
    .descendants()
    .map(d => d.data[colorKey])
    .filter((d, i, a) => a.indexOf(d) === i)
    .sort();
  colorScale = d3.scaleOrdinal(d3.schemeSet1).domain(colorDomain);
  console.log('colorDomain', colorDomain);
  console.log('colorScale', colorScale);
}

treeFromCsvTextArea();
render();
