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

let width = queryParams.width ? +queryParams.width : 800;
let height = queryParams.height ? +queryParams.height : 800;

// padding around the chart where axes will go
const padding = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
};

// inner chart dimensions, where the dots are plotted
let plotAreaWidth = width - padding.left - padding.right;
let plotAreaHeight = height - padding.top - padding.bottom;

function updateDimensions(w, h) {
  width = w;
  height = h;

  // inner chart dimensions, where the dots are plotted
  plotAreaWidth = width - padding.left - padding.right;
  plotAreaHeight = height - padding.top - padding.bottom;
}

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

  x = Math.max(0, x);

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
    ? rootContainer.select('.vis-container').append('svg')
    : rootContainer.select('svg');

  svg.attr('width', width).attr('height', height);

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

  // choose sequential values if key is not found in the csv
  let lastUsedColumn = 0;
  const { columns } = csvData;
  if (!columns.includes(idKey)) {
    idKey = columns[lastUsedColumn];
    lastUsedColumn += 1;
  }
  if (!columns.includes(parentKey)) {
    parentKey = columns[lastUsedColumn];
    lastUsedColumn += 1;
  }
  if (!columns.includes(colorKey) && colorKey !== 'none') {
    colorKey = columns[lastUsedColumn];
    lastUsedColumn += 1;
  }
  if (!columns.includes(specialKey) && specialKey !== 'none') {
    specialKey = columns[lastUsedColumn];
    lastUsedColumn += 1;
  }

  // try to construct the tree
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

  function updateSelect(id, initialValue, updateFn, includeNone) {
    // update the column selects
    const select = d3.select(`#${id}`).on('change', function() {
      updateFn(this.value);
      treeFromCsvTextArea();
      render();
    });

    const optionBinding = select.selectAll('option').data(csvData.columns);

    optionBinding.exit().remove();
    optionBinding
      .enter()
      .append('option')
      .merge(optionBinding)
      .property('value', d => d)
      .text(d => d);

    if (includeNone) {
      select
        .append('option')
        .text('none')
        .property('value', 'none')
        .lower();
    }

    select.property('value', initialValue);
  }
  updateSelect('id-key-select', idKey, value => (idKey = value));
  updateSelect('parent-key-select', parentKey, value => (parentKey = value));
  updateSelect('color-key-select', colorKey, value => (colorKey = value), true);
  updateSelect(
    'special-key-select',
    specialKey,
    value => (specialKey = value),
    true
  );

  d3.select('#width-input').on('change', function() {
    updateDimensions(+this.value, height);
    treeFromCsvTextArea();
    render();
  });
  d3.select('#height-input').on('change', function() {
    updateDimensions(width, +this.value);
    treeFromCsvTextArea();
    render();
  });

  const colorDomain = rootNode
    .descendants()
    .map(d => d.data[colorKey])
    .filter((d, i, a) => a.indexOf(d) === i)
    .sort();

  let scheme = d3.schemeSet1;
  if (colorDomain.length === 1) {
    scheme = ['#000'];
  }
  colorScale = d3.scaleOrdinal(scheme).domain(colorDomain);
  console.log('colorDomain', colorDomain);
  console.log('colorScale', colorScale);
}

treeFromCsvTextArea();
render();
