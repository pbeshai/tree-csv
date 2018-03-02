let csvData;
let rootNode;
let idKey = 'Source';
let parentKey = 'Target';
let colorKey = 'Emotion';
let specialKey = 'Is_Influencer';
const specialSizeFactor = 1.6;
let colorScale = d3.scaleOrdinal();
let highlightNode = null;
let colorRangeOverrides = ['red'];

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
  renderColorSchemeSelector(rootNode.descendants().map(d => d.data), colorKey);
  renderControls();
  renderLegend();
  renderTree();
  renderHighlight();
}

function getTypeFromValues(values) {
  if (values.length) {
    let allNumbers = true;

    for (let value of values) {
      if (allNumbers && isNaN(parseFloat(value))) {
        allNumbers = false;
      }
    }

    if (allNumbers) {
      return 'number';
    }
  }

  // default to string
  return 'string';
}

function renderColorSchemeSelector(data, colorKey) {
  let colorData = data.map(d => d[colorKey]).filter(d => d != null && d !== '');
  const dataType = getTypeFromValues(colorData);

  let scaleType = 'ordinal';
  // make the data the right type and sort it
  if (dataType === 'number') {
    colorData = colorData.map(d => parseFloat(d));
    colorData.sort((a, b) => a - b);
  } else {
    colorData.sort();
  }

  const uniqueValues = colorData.filter((d, i, a) => a.indexOf(d) === i);
  let colorDomain = uniqueValues;

  let colorScheme = d3.schemeSet1;
  let colorInterpolator = d3.interpolateRdBu;

  if (dataType === 'number') {
    const [min, max] = d3.extent(uniqueValues);
    let colorInterpolatorFn = d3.interpolateBlues;
    if (min < 0 && max > 0) {
      colorInterpolatorFn = d3.interpolateRdBu;
    }
    // colorInterpolatorFn = d3.interpolateRdBu;
    const colorInterpolatorLimiterScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([0.15, 1 - 0.15]);
    colorInterpolator = k =>
      colorInterpolatorFn(colorInterpolatorLimiterScale(k));

    if (uniqueValues.length <= 9) {
      scaleType = 'ordinal';
      // colorScheme = d3.schemeBlues[Math.max(3, uniqueValues.length)];
      colorScheme = uniqueValues.map(d => colorInterpolator((d - min) / max));
    } else {
      scaleType = 'sequential';
      colorDomain = d3.extent(uniqueValues);
    }
  }

  if (scaleType === 'ordinal') {
    console.log('using ordinal scale');
    colorScale = d3
      .scaleOrdinal()
      .domain(colorDomain)
      .range(colorScheme);
  } else if (scaleType === 'sequential') {
    console.log('using linear scale', colorDomain, colorScheme);
    colorScale = d3
      .scaleSequential()
      .domain(colorDomain)
      .interpolator(colorInterpolator);
  }

  if (colorDomain.length === 0 && scaleType === 'ordinal') {
    colorScale = d => this.rangeValues[0];
    colorScale.range = k => {
      if (k == null) return this.rangeValues;
      this.rangeValues = k;
    };
    colorScale.domain = () => ['All'];
    colorScale.range(['#000']);
  }

  console.log('colorDomain =', colorDomain);
  console.log('got colorData', dataType, colorData);

  if (colorScale.range && colorRangeOverrides) {
    console.log('applying color overrides', colorRangeOverrides);
    const newRange = colorScale.range().slice();
    newRange.forEach((d, i) => {
      const color = colorRangeOverrides[i];
      if (color != null) {
        newRange[i] = color;
      }
    });
    colorScale.range(newRange);
  }
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

function colorHexString(scaleColor) {
  const color = d3.color(scaleColor);
  let r = color.r.toString(16);
  r = r.length === 2 ? r : `0${r}`;
  let g = color.g.toString(16);
  g = g.length === 2 ? g : `0${g}`;
  let b = color.b.toString(16);
  b = b.length === 2 ? b : `0${b}`;
  const colorStr = `#${r}${g}${b}`;
  return colorStr;
}

function renderLegend() {
  /** Legend */
  const legendContainer = rootContainer.select('.legend').empty()
    ? rootContainer.append('div').attr('class', 'legend')
    : rootContainer.select('.legend');

  const colorItems = colorScale.domain();
  const legendBinding = legendContainer
    .selectAll('.legend-item')
    .data(colorItems);
  legendBinding.exit().remove();
  const legendEntering = legendBinding
    .enter()
    .append('span')
    .attr('class', 'legend-item')
    .each(function(d, i) {
      const root = d3.select(this);
      // root.selectAll('*').remove();

      const colorStr = colorHexString(colorScale(d));

      root
        .append('input')
        .attr('class', 'legend-item-input')
        .attr('type', 'color')
        .property('value', colorStr)
        .on('change', function() {
          console.log(this.value, d, i);
          colorRangeOverrides[i] = this.value;
          render();
        });

      root
        .append('span')
        .attr('class', 'legend-swatch')
        .style('background', colorStr);
      root
        .append('span')
        .attr('class', 'legend-item-label')
        .text(d);
    });

  const legendUpdating = legendEntering
    .merge(legendBinding)
    .classed('can-override', !!colorScale.range)
    .classed('no-override', !colorScale.range);

  legendUpdating
    .select('input')
    .property('value', d => colorHexString(colorScale(d)));
  legendUpdating.select('.legend-item-label').text(d => d);
  legendUpdating
    .select('.legend-swatch')
    .style('background', d => colorHexString(colorScale(d)));

  const resetColorsBtn = legendContainer.select('.reset-colors-btn').empty()
    ? legendContainer
        .append('button')
        .attr('class', 'reset-colors-btn')
        .style('display', 'none')
        .on('click', () => {
          colorRangeOverrides = [];
          render();
        })
        .text('Reset Colors')
    : legendContainer.select('.reset-colors-btn');

  if (colorRangeOverrides.filter(d => d != null).length) {
    resetColorsBtn.style('display', '');
  } else {
    resetColorsBtn.style('display', 'none');
  }

  resetColorsBtn.raise();
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
}

treeFromCsvTextArea();
render();
