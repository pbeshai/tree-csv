var csvData;
var rootNode;
var idKey = 'Source';
var parentKey = 'Target';
var colorKey = 'Emotion';
var specialKey = 'Is_Influencer';
var specialSizeFactor = 1.6;
var colorScale = d3.scaleOrdinal();
var highlightNode = null;
var colorRangeOverrides = [];
var darkMode = false;

var queryParams = window.location.search
  .substring(1)
  .split('&')
  .filter(function (d) { return d !== ''; })
  .reduce(function (params, param) {
    var entry = param.split('=');
    params[entry[0]] = entry[1];
    return params;
  }, {});

var width = queryParams.width ? +queryParams.width : 800;
var height = queryParams.height ? +queryParams.height : 800;

// padding around the chart where axes will go
var padding = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
};

// inner chart dimensions, where the dots are plotted
var plotAreaWidth = width - padding.left - padding.right;
var plotAreaHeight = height - padding.top - padding.bottom;

function updateDimensions(w, h) {
  width = w;
  height = h;

  // inner chart dimensions, where the dots are plotted
  plotAreaWidth = width - padding.left - padding.right;
  plotAreaHeight = height - padding.top - padding.bottom;
}

// radius of points in the scatterplot
var pointRadius = 5;

// select the root container where the chart will be added
var rootContainer = d3.select('#root');

d3.select('#dark-mode').on('change', function () {
  darkMode = !darkMode;
  d3.select('body').classed('dark-mode', darkMode);
});

function render() {
  renderColorSchemeSelector(rootNode.descendants().map(function (d) { return d.data; }), colorKey);
  renderControls();
  renderLegend();
  renderTree();
  renderHighlight();
}

function getTypeFromValues(values) {
  if (values.length) {
    var allNumbers = true;

    for (var i = 0, list = values; i < list.length; i += 1) {
      var value = list[i];

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
  var this$1 = this;

  var colorData = data.map(function (d) { return d[colorKey]; }).filter(function (d) { return d != null && d !== ''; });
  var dataType = getTypeFromValues(colorData);

  var scaleType = 'ordinal';
  // make the data the right type and sort it
  if (dataType === 'number') {
    colorData = colorData.map(function (d) { return parseFloat(d); });
    colorData.sort(function (a, b) { return a - b; });
  } else {
    colorData.sort();
  }

  var uniqueValues = colorData.filter(function (d, i, a) { return a.indexOf(d) === i; });
  var colorDomain = uniqueValues;

  var colorScheme = d3.schemeSet1;
  var colorInterpolator = d3.interpolateRdBu;

  if (dataType === 'number') {
    var ref = d3.extent(uniqueValues);
    var min = ref[0];
    var max = ref[1];
    var colorInterpolatorFn = d3.interpolateBlues;
    if (min < 0 && max > 0) {
      colorInterpolatorFn = d3.interpolateRdBu;
    }
    // colorInterpolatorFn = d3.interpolateRdBu;
    var colorInterpolatorLimiterScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([0.15, 1 - 0.15]);
    colorInterpolator = function (k) { return colorInterpolatorFn(colorInterpolatorLimiterScale(k)); };

    if (uniqueValues.length <= 9) {
      scaleType = 'ordinal';
      // colorScheme = d3.schemeBlues[Math.max(3, uniqueValues.length)];
      colorScheme = uniqueValues.map(function (d) { return colorInterpolator((d - min) / max); });
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
    colorScale = function (d) { return this$1.rangeValues[0]; };
    colorScale.range = function (k) {
      if (k == null) { return this$1.rangeValues; }
      this$1.rangeValues = k;
    };
    colorScale.domain = function () { return ['All']; };
    colorScale.range(['#000']);
  }

  console.log('colorDomain =', colorDomain);
  console.log('got colorData', dataType, colorData);

  if (colorScale.range && colorRangeOverrides) {
    console.log('applying color overrides', colorRangeOverrides);
    var newRange = colorScale.range().slice();
    newRange.forEach(function (d, i) {
      var color = colorRangeOverrides[i];
      if (color != null) {
        newRange[i] = color;
      }
    });
    colorScale.range(newRange);
  }
}

function renderControls() {
  console.log('render controls');
  d3.select('#read-csv-btn').on('click', function () {
    treeFromCsvTextArea();
    render();
  });
}

function isSpecial(d) {
  return !!d[specialKey] && d[specialKey] !== '0';
}

function renderHighlight() {
  var highlightContainer = rootContainer
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
  var data = highlightNode.data;
  var highlightRowHtml = Object.keys(data)
    .map(
      function (key) { return ("<tr><td class='key'>" + key + "</td><td class='value'>" + (data[key]) + (key ===
        colorKey
          ? ("<span class='color-swatch' style='background: " + (colorScale(
              data[key]
            )) + "'></span>")
          : '') + "</td></tr>"); }
    )
    .join('');

  highlightContainer
    .style('display', '')
    .html(
      ("<table class='node-table'><tbody>" + highlightRowHtml + "</tbody></table>")
    );

  var ref = highlightContainer.node().getBoundingClientRect();
  var hWidth = ref.width;
  var hHeight = ref.height;

  var x = highlightNode.x;
  var y = highlightNode.y;
  x += padding.left;
  y += padding.top;
  var hMargin = 5;

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
  highlightContainer.style('transform', ("translate(" + x + "px, " + y + "px)"));
}

function colorHexString(scaleColor) {
  var color = d3.color(scaleColor);
  var r = color.r.toString(16);
  r = r.length === 2 ? r : ("0" + r);
  var g = color.g.toString(16);
  g = g.length === 2 ? g : ("0" + g);
  var b = color.b.toString(16);
  b = b.length === 2 ? b : ("0" + b);
  var colorStr = "#" + r + g + b;
  return colorStr;
}

function renderLegend() {
  /** Legend */
  var legendContainer = rootContainer.select('.legend').empty()
    ? rootContainer.append('div').attr('class', 'legend')
    : rootContainer.select('.legend');

  var colorItems = colorScale.domain();
  var legendBinding = legendContainer
    .selectAll('.legend-item')
    .data(colorItems);
  legendBinding.exit().remove();
  var legendEntering = legendBinding
    .enter()
    .append('span')
    .attr('class', 'legend-item')
    .each(function(d, i) {
      var root = d3.select(this);
      // root.selectAll('*').remove();

      var colorStr = colorHexString(colorScale(d));

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

  var legendUpdating = legendEntering
    .merge(legendBinding)
    .classed('can-override', !!colorScale.range)
    .classed('no-override', !colorScale.range);

  legendUpdating
    .select('input')
    .property('value', function (d) { return colorHexString(colorScale(d)); });
  legendUpdating.select('.legend-item-label').text(function (d) { return d; });
  legendUpdating
    .select('.legend-swatch')
    .style('background', function (d) { return colorHexString(colorScale(d)); });

  var resetColorsBtn = legendContainer.select('.reset-colors-btn').empty()
    ? legendContainer
        .append('button')
        .attr('class', 'reset-colors-btn')
        .style('display', 'none')
        .on('click', function () {
          colorRangeOverrides = [];
          render();
        })
        .text('Reset Colors')
    : legendContainer.select('.reset-colors-btn');

  if (colorRangeOverrides.filter(function (d) { return d != null; }).length) {
    resetColorsBtn.style('display', '');
  } else {
    resetColorsBtn.style('display', 'none');
  }

  resetColorsBtn.raise();
}

function renderTree() {
  console.log('render svg with rootNode', rootNode);
  // rootContainer.select('svg').remove();
  var nodes = rootNode ? rootNode.descendants() : [];
  var links = rootNode ? rootNode.links() : [];
  console.log('render svg with nodes', nodes);
  console.log('render svg with links', links);

  // initialize main SVG
  var svg = rootContainer.select('svg').empty()
    ? rootContainer.select('.vis-container').append('svg')
    : rootContainer.select('svg');

  svg.attr('width', width).attr('height', height);

  // the main <g> where all the chart content goes inside
  var g = svg.select('.root-g').empty()
    ? svg
        .append('g')
        .attr('class', 'root-g')
        .attr(
          'transform',
          'translate(' + padding.left + ' ' + padding.top + ')'
        )
    : svg.select('.root-g');

  var gLinks = g.select('.links').empty()
    ? g.append('g').attr('class', 'links')
    : g.select('.links');
  var gNodes = g.select('.nodes').empty()
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
  var nodesBinding = gNodes.selectAll('.node').data(nodes, function (d) { return d[idKey]; });
  nodesBinding.exit().remove();
  var nodesEnter = nodesBinding
    .enter()
    .append('circle')
    .attr('class', 'node')
    .attr('r', pointRadius)
    .attr('transform', function (d) { return ("translate(" + (d.x) + " " + (d.y) + ")"); })
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
    .classed('special', function (d) { return isSpecial(d.data); })
    .attr(
      'r',
      function (d) { return (isSpecial(d.data) ? specialSizeFactor * pointRadius : pointRadius); }
    )
    .attr('transform', function (d) { return ("translate(" + (d.x) + " " + (d.y) + ")"); })
    .style('fill', function (d) { return colorScale(d.data[colorKey]); });

  // render links
  var linksBinding = gLinks
    .selectAll('.link')
    .data(links, function (d) { return ((d.source[idKey]) + "--" + (d.target[idKey])); });
  linksBinding.exit().remove();

  var linksEnter = linksBinding
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('x1', function (d) { return d.source.x; })
    .attr('y1', function (d) { return d.source.y; })
    .attr('x2', function (d) { return d.target.x; })
    .attr('y2', function (d) { return d.target.y; });

  linksEnter
    .merge(linksBinding)
    .attr('x1', function (d) { return d.source.x; })
    .attr('y1', function (d) { return d.source.y; })
    .attr('x2', function (d) { return d.target.x; })
    .attr('y2', function (d) { return d.target.y; })
    .style('stroke', function (d) { return colorScale(d.target.data[colorKey]); });
}

function treeFromCsvTextArea() {
  var text = d3.select('#csv-text-input').property('value');
  csvData = d3.csvParse(text);

  // choose sequential values if key is not found in the csv
  var lastUsedColumn = 0;
  var columns = csvData.columns;
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
    var stratifier = d3
      .stratify()
      .id(function (d) { return d[idKey]; })
      .parentId(function (d) { return d[parentKey]; });
    rootNode = stratifier(csvData);
    d3.select('#error-message').style('display', 'none');
  } catch (e) {
    console.error(e);
    var errorMissingMatch = e.message.match(/^missing: (.*)/);
    var errorMessage = e.message;
    if (errorMissingMatch) {
      errorMessage = "Could not find parent node with ID \"" + (errorMissingMatch[1]) + "\". Did you select the right Parent column? It is currently set to " + parentKey + ".";
    } else if (e.message === 'no root') {
      errorMessage = "Could not find a node with no parent. The parent ID column (currently " + parentKey + ") should be empty for the root node of the tree.";
    } else if (e.message === 'multiple roots') {
      errorMessage = "Multiple nodes had no parent set. There can only be one root node. Ensure each node has a parent ID besides the root. The current parent column is " + parentKey + ".";
    } else if (e.message === 'cycle') {
      errorMessage = "Detected a cycle in the tree. Inspect parent IDs to ensure no cycles exist in the data. The current parent ID column is " + parentKey + ".";
    }
    d3
      .select('#error-message')
      .style('display', '')
      .select('.error-details')
      .text(errorMessage);
  }

  // run tree layout
  var tree = d3.tree().size([plotAreaWidth, plotAreaHeight]);
  tree(rootNode);

  console.log('got csvData =', csvData);
  console.log('got rootNode =', rootNode);
  console.log(idKey);

  function updateSelect(id, initialValue, updateFn, includeNone) {
    // update the column selects
    var select = d3.select(("#" + id)).on('change', function() {
      updateFn(this.value);
      treeFromCsvTextArea();
      render();
    });

    var optionBinding = select.selectAll('option').data(csvData.columns);

    optionBinding.exit().remove();
    optionBinding
      .enter()
      .append('option')
      .merge(optionBinding)
      .property('value', function (d) { return d; })
      .text(function (d) { return d; });

    if (includeNone) {
      select
        .append('option')
        .text('none')
        .property('value', 'none')
        .lower();
    }

    select.property('value', initialValue);
  }
  updateSelect('id-key-select', idKey, function (value) { return (idKey = value); });
  updateSelect('parent-key-select', parentKey, function (value) { return (parentKey = value); });
  updateSelect('color-key-select', colorKey, function (value) { return (colorKey = value); }, true);
  updateSelect(
    'special-key-select',
    specialKey,
    function (value) { return (specialKey = value); },
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzdF9zY3JpcHQuanMiLCJzb3VyY2VzIjpbInNjcmlwdC5qcy0xNTIwMDE5ODI5Mzc2Il0sInNvdXJjZXNDb250ZW50IjpbImxldCBjc3ZEYXRhO1xubGV0IHJvb3ROb2RlO1xubGV0IGlkS2V5ID0gJ1NvdXJjZSc7XG5sZXQgcGFyZW50S2V5ID0gJ1RhcmdldCc7XG5sZXQgY29sb3JLZXkgPSAnRW1vdGlvbic7XG5sZXQgc3BlY2lhbEtleSA9ICdJc19JbmZsdWVuY2VyJztcbmNvbnN0IHNwZWNpYWxTaXplRmFjdG9yID0gMS42O1xubGV0IGNvbG9yU2NhbGUgPSBkMy5zY2FsZU9yZGluYWwoKTtcbmxldCBoaWdobGlnaHROb2RlID0gbnVsbDtcbmxldCBjb2xvclJhbmdlT3ZlcnJpZGVzID0gW107XG5sZXQgZGFya01vZGUgPSBmYWxzZTtcblxuY29uc3QgcXVlcnlQYXJhbXMgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoXG4gIC5zdWJzdHJpbmcoMSlcbiAgLnNwbGl0KCcmJylcbiAgLmZpbHRlcihkID0+IGQgIT09ICcnKVxuICAucmVkdWNlKChwYXJhbXMsIHBhcmFtKSA9PiB7XG4gICAgY29uc3QgZW50cnkgPSBwYXJhbS5zcGxpdCgnPScpO1xuICAgIHBhcmFtc1tlbnRyeVswXV0gPSBlbnRyeVsxXTtcbiAgICByZXR1cm4gcGFyYW1zO1xuICB9LCB7fSk7XG5cbmxldCB3aWR0aCA9IHF1ZXJ5UGFyYW1zLndpZHRoID8gK3F1ZXJ5UGFyYW1zLndpZHRoIDogODAwO1xubGV0IGhlaWdodCA9IHF1ZXJ5UGFyYW1zLmhlaWdodCA/ICtxdWVyeVBhcmFtcy5oZWlnaHQgOiA4MDA7XG5cbi8vIHBhZGRpbmcgYXJvdW5kIHRoZSBjaGFydCB3aGVyZSBheGVzIHdpbGwgZ29cbmNvbnN0IHBhZGRpbmcgPSB7XG4gIHRvcDogMjAsXG4gIHJpZ2h0OiAyMCxcbiAgYm90dG9tOiAyMCxcbiAgbGVmdDogMjAsXG59O1xuXG4vLyBpbm5lciBjaGFydCBkaW1lbnNpb25zLCB3aGVyZSB0aGUgZG90cyBhcmUgcGxvdHRlZFxubGV0IHBsb3RBcmVhV2lkdGggPSB3aWR0aCAtIHBhZGRpbmcubGVmdCAtIHBhZGRpbmcucmlnaHQ7XG5sZXQgcGxvdEFyZWFIZWlnaHQgPSBoZWlnaHQgLSBwYWRkaW5nLnRvcCAtIHBhZGRpbmcuYm90dG9tO1xuXG5mdW5jdGlvbiB1cGRhdGVEaW1lbnNpb25zKHcsIGgpIHtcbiAgd2lkdGggPSB3O1xuICBoZWlnaHQgPSBoO1xuXG4gIC8vIGlubmVyIGNoYXJ0IGRpbWVuc2lvbnMsIHdoZXJlIHRoZSBkb3RzIGFyZSBwbG90dGVkXG4gIHBsb3RBcmVhV2lkdGggPSB3aWR0aCAtIHBhZGRpbmcubGVmdCAtIHBhZGRpbmcucmlnaHQ7XG4gIHBsb3RBcmVhSGVpZ2h0ID0gaGVpZ2h0IC0gcGFkZGluZy50b3AgLSBwYWRkaW5nLmJvdHRvbTtcbn1cblxuLy8gcmFkaXVzIG9mIHBvaW50cyBpbiB0aGUgc2NhdHRlcnBsb3RcbmNvbnN0IHBvaW50UmFkaXVzID0gNTtcblxuLy8gc2VsZWN0IHRoZSByb290IGNvbnRhaW5lciB3aGVyZSB0aGUgY2hhcnQgd2lsbCBiZSBhZGRlZFxuY29uc3Qgcm9vdENvbnRhaW5lciA9IGQzLnNlbGVjdCgnI3Jvb3QnKTtcblxuZDMuc2VsZWN0KCcjZGFyay1tb2RlJykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgZGFya01vZGUgPSAhZGFya01vZGU7XG4gIGQzLnNlbGVjdCgnYm9keScpLmNsYXNzZWQoJ2RhcmstbW9kZScsIGRhcmtNb2RlKTtcbn0pO1xuXG5mdW5jdGlvbiByZW5kZXIoKSB7XG4gIHJlbmRlckNvbG9yU2NoZW1lU2VsZWN0b3Iocm9vdE5vZGUuZGVzY2VuZGFudHMoKS5tYXAoZCA9PiBkLmRhdGEpLCBjb2xvcktleSk7XG4gIHJlbmRlckNvbnRyb2xzKCk7XG4gIHJlbmRlckxlZ2VuZCgpO1xuICByZW5kZXJUcmVlKCk7XG4gIHJlbmRlckhpZ2hsaWdodCgpO1xufVxuXG5mdW5jdGlvbiBnZXRUeXBlRnJvbVZhbHVlcyh2YWx1ZXMpIHtcbiAgaWYgKHZhbHVlcy5sZW5ndGgpIHtcbiAgICBsZXQgYWxsTnVtYmVycyA9IHRydWU7XG5cbiAgICBmb3IgKGxldCB2YWx1ZSBvZiB2YWx1ZXMpIHtcbiAgICAgIGlmIChhbGxOdW1iZXJzICYmIGlzTmFOKHBhcnNlRmxvYXQodmFsdWUpKSkge1xuICAgICAgICBhbGxOdW1iZXJzID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFsbE51bWJlcnMpIHtcbiAgICAgIHJldHVybiAnbnVtYmVyJztcbiAgICB9XG4gIH1cblxuICAvLyBkZWZhdWx0IHRvIHN0cmluZ1xuICByZXR1cm4gJ3N0cmluZyc7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckNvbG9yU2NoZW1lU2VsZWN0b3IoZGF0YSwgY29sb3JLZXkpIHtcbiAgbGV0IGNvbG9yRGF0YSA9IGRhdGEubWFwKGQgPT4gZFtjb2xvcktleV0pLmZpbHRlcihkID0+IGQgIT0gbnVsbCAmJiBkICE9PSAnJyk7XG4gIGNvbnN0IGRhdGFUeXBlID0gZ2V0VHlwZUZyb21WYWx1ZXMoY29sb3JEYXRhKTtcblxuICBsZXQgc2NhbGVUeXBlID0gJ29yZGluYWwnO1xuICAvLyBtYWtlIHRoZSBkYXRhIHRoZSByaWdodCB0eXBlIGFuZCBzb3J0IGl0XG4gIGlmIChkYXRhVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICBjb2xvckRhdGEgPSBjb2xvckRhdGEubWFwKGQgPT4gcGFyc2VGbG9hdChkKSk7XG4gICAgY29sb3JEYXRhLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcbiAgfSBlbHNlIHtcbiAgICBjb2xvckRhdGEuc29ydCgpO1xuICB9XG5cbiAgY29uc3QgdW5pcXVlVmFsdWVzID0gY29sb3JEYXRhLmZpbHRlcigoZCwgaSwgYSkgPT4gYS5pbmRleE9mKGQpID09PSBpKTtcbiAgbGV0IGNvbG9yRG9tYWluID0gdW5pcXVlVmFsdWVzO1xuXG4gIGxldCBjb2xvclNjaGVtZSA9IGQzLnNjaGVtZVNldDE7XG4gIGxldCBjb2xvckludGVycG9sYXRvciA9IGQzLmludGVycG9sYXRlUmRCdTtcblxuICBpZiAoZGF0YVR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgY29uc3QgW21pbiwgbWF4XSA9IGQzLmV4dGVudCh1bmlxdWVWYWx1ZXMpO1xuICAgIGxldCBjb2xvckludGVycG9sYXRvckZuID0gZDMuaW50ZXJwb2xhdGVCbHVlcztcbiAgICBpZiAobWluIDwgMCAmJiBtYXggPiAwKSB7XG4gICAgICBjb2xvckludGVycG9sYXRvckZuID0gZDMuaW50ZXJwb2xhdGVSZEJ1O1xuICAgIH1cbiAgICAvLyBjb2xvckludGVycG9sYXRvckZuID0gZDMuaW50ZXJwb2xhdGVSZEJ1O1xuICAgIGNvbnN0IGNvbG9ySW50ZXJwb2xhdG9yTGltaXRlclNjYWxlID0gZDNcbiAgICAgIC5zY2FsZUxpbmVhcigpXG4gICAgICAuZG9tYWluKFswLCAxXSlcbiAgICAgIC5yYW5nZShbMC4xNSwgMSAtIDAuMTVdKTtcbiAgICBjb2xvckludGVycG9sYXRvciA9IGsgPT5cbiAgICAgIGNvbG9ySW50ZXJwb2xhdG9yRm4oY29sb3JJbnRlcnBvbGF0b3JMaW1pdGVyU2NhbGUoaykpO1xuXG4gICAgaWYgKHVuaXF1ZVZhbHVlcy5sZW5ndGggPD0gOSkge1xuICAgICAgc2NhbGVUeXBlID0gJ29yZGluYWwnO1xuICAgICAgLy8gY29sb3JTY2hlbWUgPSBkMy5zY2hlbWVCbHVlc1tNYXRoLm1heCgzLCB1bmlxdWVWYWx1ZXMubGVuZ3RoKV07XG4gICAgICBjb2xvclNjaGVtZSA9IHVuaXF1ZVZhbHVlcy5tYXAoZCA9PiBjb2xvckludGVycG9sYXRvcigoZCAtIG1pbikgLyBtYXgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NhbGVUeXBlID0gJ3NlcXVlbnRpYWwnO1xuICAgICAgY29sb3JEb21haW4gPSBkMy5leHRlbnQodW5pcXVlVmFsdWVzKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc2NhbGVUeXBlID09PSAnb3JkaW5hbCcpIHtcbiAgICBjb25zb2xlLmxvZygndXNpbmcgb3JkaW5hbCBzY2FsZScpO1xuICAgIGNvbG9yU2NhbGUgPSBkM1xuICAgICAgLnNjYWxlT3JkaW5hbCgpXG4gICAgICAuZG9tYWluKGNvbG9yRG9tYWluKVxuICAgICAgLnJhbmdlKGNvbG9yU2NoZW1lKTtcbiAgfSBlbHNlIGlmIChzY2FsZVR5cGUgPT09ICdzZXF1ZW50aWFsJykge1xuICAgIGNvbnNvbGUubG9nKCd1c2luZyBsaW5lYXIgc2NhbGUnLCBjb2xvckRvbWFpbiwgY29sb3JTY2hlbWUpO1xuICAgIGNvbG9yU2NhbGUgPSBkM1xuICAgICAgLnNjYWxlU2VxdWVudGlhbCgpXG4gICAgICAuZG9tYWluKGNvbG9yRG9tYWluKVxuICAgICAgLmludGVycG9sYXRvcihjb2xvckludGVycG9sYXRvcik7XG4gIH1cblxuICBpZiAoY29sb3JEb21haW4ubGVuZ3RoID09PSAwICYmIHNjYWxlVHlwZSA9PT0gJ29yZGluYWwnKSB7XG4gICAgY29sb3JTY2FsZSA9IGQgPT4gdGhpcy5yYW5nZVZhbHVlc1swXTtcbiAgICBjb2xvclNjYWxlLnJhbmdlID0gayA9PiB7XG4gICAgICBpZiAoayA9PSBudWxsKSByZXR1cm4gdGhpcy5yYW5nZVZhbHVlcztcbiAgICAgIHRoaXMucmFuZ2VWYWx1ZXMgPSBrO1xuICAgIH07XG4gICAgY29sb3JTY2FsZS5kb21haW4gPSAoKSA9PiBbJ0FsbCddO1xuICAgIGNvbG9yU2NhbGUucmFuZ2UoWycjMDAwJ10pO1xuICB9XG5cbiAgY29uc29sZS5sb2coJ2NvbG9yRG9tYWluID0nLCBjb2xvckRvbWFpbik7XG4gIGNvbnNvbGUubG9nKCdnb3QgY29sb3JEYXRhJywgZGF0YVR5cGUsIGNvbG9yRGF0YSk7XG5cbiAgaWYgKGNvbG9yU2NhbGUucmFuZ2UgJiYgY29sb3JSYW5nZU92ZXJyaWRlcykge1xuICAgIGNvbnNvbGUubG9nKCdhcHBseWluZyBjb2xvciBvdmVycmlkZXMnLCBjb2xvclJhbmdlT3ZlcnJpZGVzKTtcbiAgICBjb25zdCBuZXdSYW5nZSA9IGNvbG9yU2NhbGUucmFuZ2UoKS5zbGljZSgpO1xuICAgIG5ld1JhbmdlLmZvckVhY2goKGQsIGkpID0+IHtcbiAgICAgIGNvbnN0IGNvbG9yID0gY29sb3JSYW5nZU92ZXJyaWRlc1tpXTtcbiAgICAgIGlmIChjb2xvciAhPSBudWxsKSB7XG4gICAgICAgIG5ld1JhbmdlW2ldID0gY29sb3I7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29sb3JTY2FsZS5yYW5nZShuZXdSYW5nZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyQ29udHJvbHMoKSB7XG4gIGNvbnNvbGUubG9nKCdyZW5kZXIgY29udHJvbHMnKTtcbiAgZDMuc2VsZWN0KCcjcmVhZC1jc3YtYnRuJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgIHRyZWVGcm9tQ3N2VGV4dEFyZWEoKTtcbiAgICByZW5kZXIoKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzU3BlY2lhbChkKSB7XG4gIHJldHVybiAhIWRbc3BlY2lhbEtleV0gJiYgZFtzcGVjaWFsS2V5XSAhPT0gJzAnO1xufVxuXG5mdW5jdGlvbiByZW5kZXJIaWdobGlnaHQoKSB7XG4gIGNvbnN0IGhpZ2hsaWdodENvbnRhaW5lciA9IHJvb3RDb250YWluZXJcbiAgICAuc2VsZWN0KCcuaGlnaGxpZ2h0LWNvbnRhaW5lcicpXG4gICAgLmVtcHR5KClcbiAgICA/IHJvb3RDb250YWluZXJcbiAgICAgICAgLnNlbGVjdCgnLnZpcy1jb250YWluZXInKVxuICAgICAgICAuYXBwZW5kKCdkaXYnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnaGlnaGxpZ2h0LWNvbnRhaW5lcicpXG4gICAgOiByb290Q29udGFpbmVyLnNlbGVjdCgnLmhpZ2hsaWdodC1jb250YWluZXInKTtcblxuICBpZiAoIWhpZ2hsaWdodE5vZGUpIHtcbiAgICBoaWdobGlnaHRDb250YWluZXIuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB7IGRhdGEgfSA9IGhpZ2hsaWdodE5vZGU7XG4gIGNvbnN0IGhpZ2hsaWdodFJvd0h0bWwgPSBPYmplY3Qua2V5cyhkYXRhKVxuICAgIC5tYXAoXG4gICAgICBrZXkgPT5cbiAgICAgICAgYDx0cj48dGQgY2xhc3M9J2tleSc+JHtrZXl9PC90ZD48dGQgY2xhc3M9J3ZhbHVlJz4ke2RhdGFba2V5XX0ke2tleSA9PT1cbiAgICAgICAgY29sb3JLZXlcbiAgICAgICAgICA/IGA8c3BhbiBjbGFzcz0nY29sb3Itc3dhdGNoJyBzdHlsZT0nYmFja2dyb3VuZDogJHtjb2xvclNjYWxlKFxuICAgICAgICAgICAgICBkYXRhW2tleV1cbiAgICAgICAgICAgICl9Jz48L3NwYW4+YFxuICAgICAgICAgIDogJyd9PC90ZD48L3RyPmBcbiAgICApXG4gICAgLmpvaW4oJycpO1xuXG4gIGhpZ2hsaWdodENvbnRhaW5lclxuICAgIC5zdHlsZSgnZGlzcGxheScsICcnKVxuICAgIC5odG1sKFxuICAgICAgYDx0YWJsZSBjbGFzcz0nbm9kZS10YWJsZSc+PHRib2R5PiR7aGlnaGxpZ2h0Um93SHRtbH08L3Rib2R5PjwvdGFibGU+YFxuICAgICk7XG5cbiAgY29uc3Qge1xuICAgIHdpZHRoOiBoV2lkdGgsXG4gICAgaGVpZ2h0OiBoSGVpZ2h0LFxuICB9ID0gaGlnaGxpZ2h0Q29udGFpbmVyLm5vZGUoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICBsZXQgeyB4LCB5IH0gPSBoaWdobGlnaHROb2RlO1xuICB4ICs9IHBhZGRpbmcubGVmdDtcbiAgeSArPSBwYWRkaW5nLnRvcDtcbiAgY29uc3QgaE1hcmdpbiA9IDU7XG5cbiAgaWYgKHkgKyBoSGVpZ2h0ID4gaGVpZ2h0KSB7XG4gICAgeSAtPSBoSGVpZ2h0O1xuICAgIHkgLT0gaE1hcmdpbjtcbiAgfSBlbHNlIHtcbiAgICB5ICs9IGhNYXJnaW47XG4gIH1cblxuICBpZiAoeCArIGhXaWR0aCA+IHdpZHRoKSB7XG4gICAgeCAtPSBoV2lkdGg7XG4gICAgeCAtPSBoTWFyZ2luO1xuICB9IGVsc2Uge1xuICAgIHggKz0gaE1hcmdpbjtcbiAgfVxuXG4gIHggPSBNYXRoLm1heCgwLCB4KTtcblxuICBjb25zb2xlLmxvZyhoaWdobGlnaHROb2RlLCB4LCB5KTtcbiAgaGlnaGxpZ2h0Q29udGFpbmVyLnN0eWxlKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlKCR7eH1weCwgJHt5fXB4KWApO1xufVxuXG5mdW5jdGlvbiBjb2xvckhleFN0cmluZyhzY2FsZUNvbG9yKSB7XG4gIGNvbnN0IGNvbG9yID0gZDMuY29sb3Ioc2NhbGVDb2xvcik7XG4gIGxldCByID0gY29sb3Iuci50b1N0cmluZygxNik7XG4gIHIgPSByLmxlbmd0aCA9PT0gMiA/IHIgOiBgMCR7cn1gO1xuICBsZXQgZyA9IGNvbG9yLmcudG9TdHJpbmcoMTYpO1xuICBnID0gZy5sZW5ndGggPT09IDIgPyBnIDogYDAke2d9YDtcbiAgbGV0IGIgPSBjb2xvci5iLnRvU3RyaW5nKDE2KTtcbiAgYiA9IGIubGVuZ3RoID09PSAyID8gYiA6IGAwJHtifWA7XG4gIGNvbnN0IGNvbG9yU3RyID0gYCMke3J9JHtnfSR7Yn1gO1xuICByZXR1cm4gY29sb3JTdHI7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckxlZ2VuZCgpIHtcbiAgLyoqIExlZ2VuZCAqL1xuICBjb25zdCBsZWdlbmRDb250YWluZXIgPSByb290Q29udGFpbmVyLnNlbGVjdCgnLmxlZ2VuZCcpLmVtcHR5KClcbiAgICA/IHJvb3RDb250YWluZXIuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdsZWdlbmQnKVxuICAgIDogcm9vdENvbnRhaW5lci5zZWxlY3QoJy5sZWdlbmQnKTtcblxuICBjb25zdCBjb2xvckl0ZW1zID0gY29sb3JTY2FsZS5kb21haW4oKTtcbiAgY29uc3QgbGVnZW5kQmluZGluZyA9IGxlZ2VuZENvbnRhaW5lclxuICAgIC5zZWxlY3RBbGwoJy5sZWdlbmQtaXRlbScpXG4gICAgLmRhdGEoY29sb3JJdGVtcyk7XG4gIGxlZ2VuZEJpbmRpbmcuZXhpdCgpLnJlbW92ZSgpO1xuICBjb25zdCBsZWdlbmRFbnRlcmluZyA9IGxlZ2VuZEJpbmRpbmdcbiAgICAuZW50ZXIoKVxuICAgIC5hcHBlbmQoJ3NwYW4nKVxuICAgIC5hdHRyKCdjbGFzcycsICdsZWdlbmQtaXRlbScpXG4gICAgLmVhY2goZnVuY3Rpb24oZCwgaSkge1xuICAgICAgY29uc3Qgcm9vdCA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgIC8vIHJvb3Quc2VsZWN0QWxsKCcqJykucmVtb3ZlKCk7XG5cbiAgICAgIGNvbnN0IGNvbG9yU3RyID0gY29sb3JIZXhTdHJpbmcoY29sb3JTY2FsZShkKSk7XG5cbiAgICAgIHJvb3RcbiAgICAgICAgLmFwcGVuZCgnaW5wdXQnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnbGVnZW5kLWl0ZW0taW5wdXQnKVxuICAgICAgICAuYXR0cigndHlwZScsICdjb2xvcicpXG4gICAgICAgIC5wcm9wZXJ0eSgndmFsdWUnLCBjb2xvclN0cilcbiAgICAgICAgLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnZhbHVlLCBkLCBpKTtcbiAgICAgICAgICBjb2xvclJhbmdlT3ZlcnJpZGVzW2ldID0gdGhpcy52YWx1ZTtcbiAgICAgICAgICByZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHJvb3RcbiAgICAgICAgLmFwcGVuZCgnc3BhbicpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdsZWdlbmQtc3dhdGNoJylcbiAgICAgICAgLnN0eWxlKCdiYWNrZ3JvdW5kJywgY29sb3JTdHIpO1xuICAgICAgcm9vdFxuICAgICAgICAuYXBwZW5kKCdzcGFuJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZC1pdGVtLWxhYmVsJylcbiAgICAgICAgLnRleHQoZCk7XG4gICAgfSk7XG5cbiAgY29uc3QgbGVnZW5kVXBkYXRpbmcgPSBsZWdlbmRFbnRlcmluZ1xuICAgIC5tZXJnZShsZWdlbmRCaW5kaW5nKVxuICAgIC5jbGFzc2VkKCdjYW4tb3ZlcnJpZGUnLCAhIWNvbG9yU2NhbGUucmFuZ2UpXG4gICAgLmNsYXNzZWQoJ25vLW92ZXJyaWRlJywgIWNvbG9yU2NhbGUucmFuZ2UpO1xuXG4gIGxlZ2VuZFVwZGF0aW5nXG4gICAgLnNlbGVjdCgnaW5wdXQnKVxuICAgIC5wcm9wZXJ0eSgndmFsdWUnLCBkID0+IGNvbG9ySGV4U3RyaW5nKGNvbG9yU2NhbGUoZCkpKTtcbiAgbGVnZW5kVXBkYXRpbmcuc2VsZWN0KCcubGVnZW5kLWl0ZW0tbGFiZWwnKS50ZXh0KGQgPT4gZCk7XG4gIGxlZ2VuZFVwZGF0aW5nXG4gICAgLnNlbGVjdCgnLmxlZ2VuZC1zd2F0Y2gnKVxuICAgIC5zdHlsZSgnYmFja2dyb3VuZCcsIGQgPT4gY29sb3JIZXhTdHJpbmcoY29sb3JTY2FsZShkKSkpO1xuXG4gIGNvbnN0IHJlc2V0Q29sb3JzQnRuID0gbGVnZW5kQ29udGFpbmVyLnNlbGVjdCgnLnJlc2V0LWNvbG9ycy1idG4nKS5lbXB0eSgpXG4gICAgPyBsZWdlbmRDb250YWluZXJcbiAgICAgICAgLmFwcGVuZCgnYnV0dG9uJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3Jlc2V0LWNvbG9ycy1idG4nKVxuICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpXG4gICAgICAgIC5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgY29sb3JSYW5nZU92ZXJyaWRlcyA9IFtdO1xuICAgICAgICAgIHJlbmRlcigpO1xuICAgICAgICB9KVxuICAgICAgICAudGV4dCgnUmVzZXQgQ29sb3JzJylcbiAgICA6IGxlZ2VuZENvbnRhaW5lci5zZWxlY3QoJy5yZXNldC1jb2xvcnMtYnRuJyk7XG5cbiAgaWYgKGNvbG9yUmFuZ2VPdmVycmlkZXMuZmlsdGVyKGQgPT4gZCAhPSBudWxsKS5sZW5ndGgpIHtcbiAgICByZXNldENvbG9yc0J0bi5zdHlsZSgnZGlzcGxheScsICcnKTtcbiAgfSBlbHNlIHtcbiAgICByZXNldENvbG9yc0J0bi5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG4gIH1cblxuICByZXNldENvbG9yc0J0bi5yYWlzZSgpO1xufVxuXG5mdW5jdGlvbiByZW5kZXJUcmVlKCkge1xuICBjb25zb2xlLmxvZygncmVuZGVyIHN2ZyB3aXRoIHJvb3ROb2RlJywgcm9vdE5vZGUpO1xuICAvLyByb290Q29udGFpbmVyLnNlbGVjdCgnc3ZnJykucmVtb3ZlKCk7XG4gIGNvbnN0IG5vZGVzID0gcm9vdE5vZGUgPyByb290Tm9kZS5kZXNjZW5kYW50cygpIDogW107XG4gIGNvbnN0IGxpbmtzID0gcm9vdE5vZGUgPyByb290Tm9kZS5saW5rcygpIDogW107XG4gIGNvbnNvbGUubG9nKCdyZW5kZXIgc3ZnIHdpdGggbm9kZXMnLCBub2Rlcyk7XG4gIGNvbnNvbGUubG9nKCdyZW5kZXIgc3ZnIHdpdGggbGlua3MnLCBsaW5rcyk7XG5cbiAgLy8gaW5pdGlhbGl6ZSBtYWluIFNWR1xuICBjb25zdCBzdmcgPSByb290Q29udGFpbmVyLnNlbGVjdCgnc3ZnJykuZW1wdHkoKVxuICAgID8gcm9vdENvbnRhaW5lci5zZWxlY3QoJy52aXMtY29udGFpbmVyJykuYXBwZW5kKCdzdmcnKVxuICAgIDogcm9vdENvbnRhaW5lci5zZWxlY3QoJ3N2ZycpO1xuXG4gIHN2Zy5hdHRyKCd3aWR0aCcsIHdpZHRoKS5hdHRyKCdoZWlnaHQnLCBoZWlnaHQpO1xuXG4gIC8vIHRoZSBtYWluIDxnPiB3aGVyZSBhbGwgdGhlIGNoYXJ0IGNvbnRlbnQgZ29lcyBpbnNpZGVcbiAgY29uc3QgZyA9IHN2Zy5zZWxlY3QoJy5yb290LWcnKS5lbXB0eSgpXG4gICAgPyBzdmdcbiAgICAgICAgLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdyb290LWcnKVxuICAgICAgICAuYXR0cihcbiAgICAgICAgICAndHJhbnNmb3JtJyxcbiAgICAgICAgICAndHJhbnNsYXRlKCcgKyBwYWRkaW5nLmxlZnQgKyAnICcgKyBwYWRkaW5nLnRvcCArICcpJ1xuICAgICAgICApXG4gICAgOiBzdmcuc2VsZWN0KCcucm9vdC1nJyk7XG5cbiAgY29uc3QgZ0xpbmtzID0gZy5zZWxlY3QoJy5saW5rcycpLmVtcHR5KClcbiAgICA/IGcuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnbGlua3MnKVxuICAgIDogZy5zZWxlY3QoJy5saW5rcycpO1xuICBjb25zdCBnTm9kZXMgPSBnLnNlbGVjdCgnLm5vZGVzJykuZW1wdHkoKVxuICAgID8gZy5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdub2RlcycpXG4gICAgOiBnLnNlbGVjdCgnLm5vZGVzJyk7XG5cbiAgLy8gY29uc3QgaGlnaGxpZ2h0TGFiZWwgPSBnLnNlbGVjdCgnLmhpZ2hsaWdodC1sYWJlbCcpLmVtcHR5KClcbiAgLy8gICA/IGdcbiAgLy8gICAgICAgLmFwcGVuZCgndGV4dCcpXG4gIC8vICAgICAgIC5hdHRyKCdjbGFzcycsICdoaWdobGlnaHQtbGFiZWwnKVxuICAvLyAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcbiAgLy8gICAgICAgLmF0dHIoJ2R5JywgcG9pbnRSYWRpdXMgKyAxOClcbiAgLy8gICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsICc2MDAnKVxuICAvLyAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxuICAvLyAgIDogZy5zZWxlY3QoJy5oaWdobGlnaHQtbGFiZWwnKTtcblxuICAvLyByZW5kZXIgbm9kZXNcbiAgY29uc3Qgbm9kZXNCaW5kaW5nID0gZ05vZGVzLnNlbGVjdEFsbCgnLm5vZGUnKS5kYXRhKG5vZGVzLCBkID0+IGRbaWRLZXldKTtcbiAgbm9kZXNCaW5kaW5nLmV4aXQoKS5yZW1vdmUoKTtcbiAgY29uc3Qgbm9kZXNFbnRlciA9IG5vZGVzQmluZGluZ1xuICAgIC5lbnRlcigpXG4gICAgLmFwcGVuZCgnY2lyY2xlJylcbiAgICAuYXR0cignY2xhc3MnLCAnbm9kZScpXG4gICAgLmF0dHIoJ3InLCBwb2ludFJhZGl1cylcbiAgICAuYXR0cigndHJhbnNmb3JtJywgZCA9PiBgdHJhbnNsYXRlKCR7ZC54fSAke2QueX0pYClcbiAgICAub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbihkKSB7XG4gICAgICAvLyBoaWdobGlnaHRMYWJlbFxuICAgICAgLy8gICAuYXR0cigndHJhbnNmb3JtJywgYHRyYW5zbGF0ZSgke2QueH0gJHtkLnl9KWApXG4gICAgICAvLyAgIC50ZXh0KEpTT04uc3RyaW5naWZ5KGQuZGF0YSkpO1xuICAgICAgaGlnaGxpZ2h0Tm9kZSA9IGQ7XG4gICAgICByZW5kZXJIaWdobGlnaHQoKTtcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdoaWdobGlnaHRlZCcsIHRydWUpO1xuICAgIH0pXG4gICAgLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oKSB7XG4gICAgICAvLyBoaWdobGlnaHRMYWJlbC50ZXh0KCcnKTtcbiAgICAgIGhpZ2hsaWdodE5vZGUgPSBudWxsO1xuICAgICAgcmVuZGVySGlnaGxpZ2h0KCk7XG4gICAgICBkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnaGlnaGxpZ2h0ZWQnLCBmYWxzZSk7XG4gICAgfSk7XG5cbiAgbm9kZXNFbnRlclxuICAgIC5tZXJnZShub2Rlc0JpbmRpbmcpXG4gICAgLmNsYXNzZWQoJ3NwZWNpYWwnLCBkID0+IGlzU3BlY2lhbChkLmRhdGEpKVxuICAgIC5hdHRyKFxuICAgICAgJ3InLFxuICAgICAgZCA9PiAoaXNTcGVjaWFsKGQuZGF0YSkgPyBzcGVjaWFsU2l6ZUZhY3RvciAqIHBvaW50UmFkaXVzIDogcG9pbnRSYWRpdXMpXG4gICAgKVxuICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBkID0+IGB0cmFuc2xhdGUoJHtkLnh9ICR7ZC55fSlgKVxuICAgIC5zdHlsZSgnZmlsbCcsIGQgPT4gY29sb3JTY2FsZShkLmRhdGFbY29sb3JLZXldKSk7XG5cbiAgLy8gcmVuZGVyIGxpbmtzXG4gIGNvbnN0IGxpbmtzQmluZGluZyA9IGdMaW5rc1xuICAgIC5zZWxlY3RBbGwoJy5saW5rJylcbiAgICAuZGF0YShsaW5rcywgZCA9PiBgJHtkLnNvdXJjZVtpZEtleV19LS0ke2QudGFyZ2V0W2lkS2V5XX1gKTtcbiAgbGlua3NCaW5kaW5nLmV4aXQoKS5yZW1vdmUoKTtcblxuICBjb25zdCBsaW5rc0VudGVyID0gbGlua3NCaW5kaW5nXG4gICAgLmVudGVyKClcbiAgICAuYXBwZW5kKCdsaW5lJylcbiAgICAuYXR0cignY2xhc3MnLCAnbGluaycpXG4gICAgLmF0dHIoJ3gxJywgZCA9PiBkLnNvdXJjZS54KVxuICAgIC5hdHRyKCd5MScsIGQgPT4gZC5zb3VyY2UueSlcbiAgICAuYXR0cigneDInLCBkID0+IGQudGFyZ2V0LngpXG4gICAgLmF0dHIoJ3kyJywgZCA9PiBkLnRhcmdldC55KTtcblxuICBsaW5rc0VudGVyXG4gICAgLm1lcmdlKGxpbmtzQmluZGluZylcbiAgICAuYXR0cigneDEnLCBkID0+IGQuc291cmNlLngpXG4gICAgLmF0dHIoJ3kxJywgZCA9PiBkLnNvdXJjZS55KVxuICAgIC5hdHRyKCd4MicsIGQgPT4gZC50YXJnZXQueClcbiAgICAuYXR0cigneTInLCBkID0+IGQudGFyZ2V0LnkpXG4gICAgLnN0eWxlKCdzdHJva2UnLCBkID0+IGNvbG9yU2NhbGUoZC50YXJnZXQuZGF0YVtjb2xvcktleV0pKTtcbn1cblxuZnVuY3Rpb24gdHJlZUZyb21Dc3ZUZXh0QXJlYSgpIHtcbiAgY29uc3QgdGV4dCA9IGQzLnNlbGVjdCgnI2Nzdi10ZXh0LWlucHV0JykucHJvcGVydHkoJ3ZhbHVlJyk7XG4gIGNzdkRhdGEgPSBkMy5jc3ZQYXJzZSh0ZXh0KTtcblxuICAvLyBjaG9vc2Ugc2VxdWVudGlhbCB2YWx1ZXMgaWYga2V5IGlzIG5vdCBmb3VuZCBpbiB0aGUgY3N2XG4gIGxldCBsYXN0VXNlZENvbHVtbiA9IDA7XG4gIGNvbnN0IHsgY29sdW1ucyB9ID0gY3N2RGF0YTtcbiAgaWYgKCFjb2x1bW5zLmluY2x1ZGVzKGlkS2V5KSkge1xuICAgIGlkS2V5ID0gY29sdW1uc1tsYXN0VXNlZENvbHVtbl07XG4gICAgbGFzdFVzZWRDb2x1bW4gKz0gMTtcbiAgfVxuICBpZiAoIWNvbHVtbnMuaW5jbHVkZXMocGFyZW50S2V5KSkge1xuICAgIHBhcmVudEtleSA9IGNvbHVtbnNbbGFzdFVzZWRDb2x1bW5dO1xuICAgIGxhc3RVc2VkQ29sdW1uICs9IDE7XG4gIH1cbiAgaWYgKCFjb2x1bW5zLmluY2x1ZGVzKGNvbG9yS2V5KSAmJiBjb2xvcktleSAhPT0gJ25vbmUnKSB7XG4gICAgY29sb3JLZXkgPSBjb2x1bW5zW2xhc3RVc2VkQ29sdW1uXTtcbiAgICBsYXN0VXNlZENvbHVtbiArPSAxO1xuICB9XG4gIGlmICghY29sdW1ucy5pbmNsdWRlcyhzcGVjaWFsS2V5KSAmJiBzcGVjaWFsS2V5ICE9PSAnbm9uZScpIHtcbiAgICBzcGVjaWFsS2V5ID0gY29sdW1uc1tsYXN0VXNlZENvbHVtbl07XG4gICAgbGFzdFVzZWRDb2x1bW4gKz0gMTtcbiAgfVxuXG4gIC8vIHRyeSB0byBjb25zdHJ1Y3QgdGhlIHRyZWVcbiAgdHJ5IHtcbiAgICBjb25zdCBzdHJhdGlmaWVyID0gZDNcbiAgICAgIC5zdHJhdGlmeSgpXG4gICAgICAuaWQoZCA9PiBkW2lkS2V5XSlcbiAgICAgIC5wYXJlbnRJZChkID0+IGRbcGFyZW50S2V5XSk7XG4gICAgcm9vdE5vZGUgPSBzdHJhdGlmaWVyKGNzdkRhdGEpO1xuICAgIGQzLnNlbGVjdCgnI2Vycm9yLW1lc3NhZ2UnKS5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIGNvbnN0IGVycm9yTWlzc2luZ01hdGNoID0gZS5tZXNzYWdlLm1hdGNoKC9ebWlzc2luZzogKC4qKS8pO1xuICAgIGxldCBlcnJvck1lc3NhZ2UgPSBlLm1lc3NhZ2U7XG4gICAgaWYgKGVycm9yTWlzc2luZ01hdGNoKSB7XG4gICAgICBlcnJvck1lc3NhZ2UgPSBgQ291bGQgbm90IGZpbmQgcGFyZW50IG5vZGUgd2l0aCBJRCBcIiR7ZXJyb3JNaXNzaW5nTWF0Y2hbMV19XCIuIERpZCB5b3Ugc2VsZWN0IHRoZSByaWdodCBQYXJlbnQgY29sdW1uPyBJdCBpcyBjdXJyZW50bHkgc2V0IHRvICR7cGFyZW50S2V5fS5gO1xuICAgIH0gZWxzZSBpZiAoZS5tZXNzYWdlID09PSAnbm8gcm9vdCcpIHtcbiAgICAgIGVycm9yTWVzc2FnZSA9IGBDb3VsZCBub3QgZmluZCBhIG5vZGUgd2l0aCBubyBwYXJlbnQuIFRoZSBwYXJlbnQgSUQgY29sdW1uIChjdXJyZW50bHkgJHtwYXJlbnRLZXl9KSBzaG91bGQgYmUgZW1wdHkgZm9yIHRoZSByb290IG5vZGUgb2YgdGhlIHRyZWUuYDtcbiAgICB9IGVsc2UgaWYgKGUubWVzc2FnZSA9PT0gJ211bHRpcGxlIHJvb3RzJykge1xuICAgICAgZXJyb3JNZXNzYWdlID0gYE11bHRpcGxlIG5vZGVzIGhhZCBubyBwYXJlbnQgc2V0LiBUaGVyZSBjYW4gb25seSBiZSBvbmUgcm9vdCBub2RlLiBFbnN1cmUgZWFjaCBub2RlIGhhcyBhIHBhcmVudCBJRCBiZXNpZGVzIHRoZSByb290LiBUaGUgY3VycmVudCBwYXJlbnQgY29sdW1uIGlzICR7cGFyZW50S2V5fS5gO1xuICAgIH0gZWxzZSBpZiAoZS5tZXNzYWdlID09PSAnY3ljbGUnKSB7XG4gICAgICBlcnJvck1lc3NhZ2UgPSBgRGV0ZWN0ZWQgYSBjeWNsZSBpbiB0aGUgdHJlZS4gSW5zcGVjdCBwYXJlbnQgSURzIHRvIGVuc3VyZSBubyBjeWNsZXMgZXhpc3QgaW4gdGhlIGRhdGEuIFRoZSBjdXJyZW50IHBhcmVudCBJRCBjb2x1bW4gaXMgJHtwYXJlbnRLZXl9LmA7XG4gICAgfVxuICAgIGQzXG4gICAgICAuc2VsZWN0KCcjZXJyb3ItbWVzc2FnZScpXG4gICAgICAuc3R5bGUoJ2Rpc3BsYXknLCAnJylcbiAgICAgIC5zZWxlY3QoJy5lcnJvci1kZXRhaWxzJylcbiAgICAgIC50ZXh0KGVycm9yTWVzc2FnZSk7XG4gIH1cblxuICAvLyBydW4gdHJlZSBsYXlvdXRcbiAgY29uc3QgdHJlZSA9IGQzLnRyZWUoKS5zaXplKFtwbG90QXJlYVdpZHRoLCBwbG90QXJlYUhlaWdodF0pO1xuICB0cmVlKHJvb3ROb2RlKTtcblxuICBjb25zb2xlLmxvZygnZ290IGNzdkRhdGEgPScsIGNzdkRhdGEpO1xuICBjb25zb2xlLmxvZygnZ290IHJvb3ROb2RlID0nLCByb290Tm9kZSk7XG4gIGNvbnNvbGUubG9nKGlkS2V5KTtcblxuICBmdW5jdGlvbiB1cGRhdGVTZWxlY3QoaWQsIGluaXRpYWxWYWx1ZSwgdXBkYXRlRm4sIGluY2x1ZGVOb25lKSB7XG4gICAgLy8gdXBkYXRlIHRoZSBjb2x1bW4gc2VsZWN0c1xuICAgIGNvbnN0IHNlbGVjdCA9IGQzLnNlbGVjdChgIyR7aWR9YCkub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgdXBkYXRlRm4odGhpcy52YWx1ZSk7XG4gICAgICB0cmVlRnJvbUNzdlRleHRBcmVhKCk7XG4gICAgICByZW5kZXIoKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IG9wdGlvbkJpbmRpbmcgPSBzZWxlY3Quc2VsZWN0QWxsKCdvcHRpb24nKS5kYXRhKGNzdkRhdGEuY29sdW1ucyk7XG5cbiAgICBvcHRpb25CaW5kaW5nLmV4aXQoKS5yZW1vdmUoKTtcbiAgICBvcHRpb25CaW5kaW5nXG4gICAgICAuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgnb3B0aW9uJylcbiAgICAgIC5tZXJnZShvcHRpb25CaW5kaW5nKVxuICAgICAgLnByb3BlcnR5KCd2YWx1ZScsIGQgPT4gZClcbiAgICAgIC50ZXh0KGQgPT4gZCk7XG5cbiAgICBpZiAoaW5jbHVkZU5vbmUpIHtcbiAgICAgIHNlbGVjdFxuICAgICAgICAuYXBwZW5kKCdvcHRpb24nKVxuICAgICAgICAudGV4dCgnbm9uZScpXG4gICAgICAgIC5wcm9wZXJ0eSgndmFsdWUnLCAnbm9uZScpXG4gICAgICAgIC5sb3dlcigpO1xuICAgIH1cblxuICAgIHNlbGVjdC5wcm9wZXJ0eSgndmFsdWUnLCBpbml0aWFsVmFsdWUpO1xuICB9XG4gIHVwZGF0ZVNlbGVjdCgnaWQta2V5LXNlbGVjdCcsIGlkS2V5LCB2YWx1ZSA9PiAoaWRLZXkgPSB2YWx1ZSkpO1xuICB1cGRhdGVTZWxlY3QoJ3BhcmVudC1rZXktc2VsZWN0JywgcGFyZW50S2V5LCB2YWx1ZSA9PiAocGFyZW50S2V5ID0gdmFsdWUpKTtcbiAgdXBkYXRlU2VsZWN0KCdjb2xvci1rZXktc2VsZWN0JywgY29sb3JLZXksIHZhbHVlID0+IChjb2xvcktleSA9IHZhbHVlKSwgdHJ1ZSk7XG4gIHVwZGF0ZVNlbGVjdChcbiAgICAnc3BlY2lhbC1rZXktc2VsZWN0JyxcbiAgICBzcGVjaWFsS2V5LFxuICAgIHZhbHVlID0+IChzcGVjaWFsS2V5ID0gdmFsdWUpLFxuICAgIHRydWVcbiAgKTtcblxuICBkMy5zZWxlY3QoJyN3aWR0aC1pbnB1dCcpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICB1cGRhdGVEaW1lbnNpb25zKCt0aGlzLnZhbHVlLCBoZWlnaHQpO1xuICAgIHRyZWVGcm9tQ3N2VGV4dEFyZWEoKTtcbiAgICByZW5kZXIoKTtcbiAgfSk7XG4gIGQzLnNlbGVjdCgnI2hlaWdodC1pbnB1dCcpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICB1cGRhdGVEaW1lbnNpb25zKHdpZHRoLCArdGhpcy52YWx1ZSk7XG4gICAgdHJlZUZyb21Dc3ZUZXh0QXJlYSgpO1xuICAgIHJlbmRlcigpO1xuICB9KTtcbn1cblxudHJlZUZyb21Dc3ZUZXh0QXJlYSgpO1xucmVuZGVyKCk7XG4iXSwibmFtZXMiOlsibGV0IiwiY29uc3QiLCJ0aGlzIl0sIm1hcHBpbmdzIjoiQUFBQUEsR0FBRyxDQUFDLE9BQU8sQ0FBQztBQUNaQSxHQUFHLENBQUMsUUFBUSxDQUFDO0FBQ2JBLEdBQUcsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO0FBQ3JCQSxHQUFHLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FB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