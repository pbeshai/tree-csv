var csvData;
var rootNode;
var idKey = 'Source';
var parentKey = 'Target';
var colorKey = 'Emotion';
var specialKey = 'Is_Influencer';
var specialSizeFactor = 1.6;
var colorScale = d3.scaleOrdinal();
var highlightNode = null;
var colorRangeOverrides = ['red'];

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
  } catch (e) {
    alert('Error occurred making tree: ' + e);
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzdF9zY3JpcHQuanMiLCJzb3VyY2VzIjpbInNjcmlwdC5qcy0xNTIwMDA4NDUyMzMzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBjc3ZEYXRhO1xubGV0IHJvb3ROb2RlO1xubGV0IGlkS2V5ID0gJ1NvdXJjZSc7XG5sZXQgcGFyZW50S2V5ID0gJ1RhcmdldCc7XG5sZXQgY29sb3JLZXkgPSAnRW1vdGlvbic7XG5sZXQgc3BlY2lhbEtleSA9ICdJc19JbmZsdWVuY2VyJztcbmNvbnN0IHNwZWNpYWxTaXplRmFjdG9yID0gMS42O1xubGV0IGNvbG9yU2NhbGUgPSBkMy5zY2FsZU9yZGluYWwoKTtcbmxldCBoaWdobGlnaHROb2RlID0gbnVsbDtcbmxldCBjb2xvclJhbmdlT3ZlcnJpZGVzID0gWydyZWQnXTtcblxuY29uc3QgcXVlcnlQYXJhbXMgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoXG4gIC5zdWJzdHJpbmcoMSlcbiAgLnNwbGl0KCcmJylcbiAgLmZpbHRlcihkID0+IGQgIT09ICcnKVxuICAucmVkdWNlKChwYXJhbXMsIHBhcmFtKSA9PiB7XG4gICAgY29uc3QgZW50cnkgPSBwYXJhbS5zcGxpdCgnPScpO1xuICAgIHBhcmFtc1tlbnRyeVswXV0gPSBlbnRyeVsxXTtcbiAgICByZXR1cm4gcGFyYW1zO1xuICB9LCB7fSk7XG5cbmxldCB3aWR0aCA9IHF1ZXJ5UGFyYW1zLndpZHRoID8gK3F1ZXJ5UGFyYW1zLndpZHRoIDogODAwO1xubGV0IGhlaWdodCA9IHF1ZXJ5UGFyYW1zLmhlaWdodCA/ICtxdWVyeVBhcmFtcy5oZWlnaHQgOiA4MDA7XG5cbi8vIHBhZGRpbmcgYXJvdW5kIHRoZSBjaGFydCB3aGVyZSBheGVzIHdpbGwgZ29cbmNvbnN0IHBhZGRpbmcgPSB7XG4gIHRvcDogMjAsXG4gIHJpZ2h0OiAyMCxcbiAgYm90dG9tOiAyMCxcbiAgbGVmdDogMjAsXG59O1xuXG4vLyBpbm5lciBjaGFydCBkaW1lbnNpb25zLCB3aGVyZSB0aGUgZG90cyBhcmUgcGxvdHRlZFxubGV0IHBsb3RBcmVhV2lkdGggPSB3aWR0aCAtIHBhZGRpbmcubGVmdCAtIHBhZGRpbmcucmlnaHQ7XG5sZXQgcGxvdEFyZWFIZWlnaHQgPSBoZWlnaHQgLSBwYWRkaW5nLnRvcCAtIHBhZGRpbmcuYm90dG9tO1xuXG5mdW5jdGlvbiB1cGRhdGVEaW1lbnNpb25zKHcsIGgpIHtcbiAgd2lkdGggPSB3O1xuICBoZWlnaHQgPSBoO1xuXG4gIC8vIGlubmVyIGNoYXJ0IGRpbWVuc2lvbnMsIHdoZXJlIHRoZSBkb3RzIGFyZSBwbG90dGVkXG4gIHBsb3RBcmVhV2lkdGggPSB3aWR0aCAtIHBhZGRpbmcubGVmdCAtIHBhZGRpbmcucmlnaHQ7XG4gIHBsb3RBcmVhSGVpZ2h0ID0gaGVpZ2h0IC0gcGFkZGluZy50b3AgLSBwYWRkaW5nLmJvdHRvbTtcbn1cblxuLy8gcmFkaXVzIG9mIHBvaW50cyBpbiB0aGUgc2NhdHRlcnBsb3RcbmNvbnN0IHBvaW50UmFkaXVzID0gNTtcblxuLy8gc2VsZWN0IHRoZSByb290IGNvbnRhaW5lciB3aGVyZSB0aGUgY2hhcnQgd2lsbCBiZSBhZGRlZFxuY29uc3Qgcm9vdENvbnRhaW5lciA9IGQzLnNlbGVjdCgnI3Jvb3QnKTtcblxuZnVuY3Rpb24gcmVuZGVyKCkge1xuICByZW5kZXJDb2xvclNjaGVtZVNlbGVjdG9yKHJvb3ROb2RlLmRlc2NlbmRhbnRzKCkubWFwKGQgPT4gZC5kYXRhKSwgY29sb3JLZXkpO1xuICByZW5kZXJDb250cm9scygpO1xuICByZW5kZXJMZWdlbmQoKTtcbiAgcmVuZGVyVHJlZSgpO1xuICByZW5kZXJIaWdobGlnaHQoKTtcbn1cblxuZnVuY3Rpb24gZ2V0VHlwZUZyb21WYWx1ZXModmFsdWVzKSB7XG4gIGlmICh2YWx1ZXMubGVuZ3RoKSB7XG4gICAgbGV0IGFsbE51bWJlcnMgPSB0cnVlO1xuXG4gICAgZm9yIChsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBpZiAoYWxsTnVtYmVycyAmJiBpc05hTihwYXJzZUZsb2F0KHZhbHVlKSkpIHtcbiAgICAgICAgYWxsTnVtYmVycyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhbGxOdW1iZXJzKSB7XG4gICAgICByZXR1cm4gJ251bWJlcic7XG4gICAgfVxuICB9XG5cbiAgLy8gZGVmYXVsdCB0byBzdHJpbmdcbiAgcmV0dXJuICdzdHJpbmcnO1xufVxuXG5mdW5jdGlvbiByZW5kZXJDb2xvclNjaGVtZVNlbGVjdG9yKGRhdGEsIGNvbG9yS2V5KSB7XG4gIGxldCBjb2xvckRhdGEgPSBkYXRhLm1hcChkID0+IGRbY29sb3JLZXldKS5maWx0ZXIoZCA9PiBkICE9IG51bGwgJiYgZCAhPT0gJycpO1xuICBjb25zdCBkYXRhVHlwZSA9IGdldFR5cGVGcm9tVmFsdWVzKGNvbG9yRGF0YSk7XG5cbiAgbGV0IHNjYWxlVHlwZSA9ICdvcmRpbmFsJztcbiAgLy8gbWFrZSB0aGUgZGF0YSB0aGUgcmlnaHQgdHlwZSBhbmQgc29ydCBpdFxuICBpZiAoZGF0YVR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgY29sb3JEYXRhID0gY29sb3JEYXRhLm1hcChkID0+IHBhcnNlRmxvYXQoZCkpO1xuICAgIGNvbG9yRGF0YS5zb3J0KChhLCBiKSA9PiBhIC0gYik7XG4gIH0gZWxzZSB7XG4gICAgY29sb3JEYXRhLnNvcnQoKTtcbiAgfVxuXG4gIGNvbnN0IHVuaXF1ZVZhbHVlcyA9IGNvbG9yRGF0YS5maWx0ZXIoKGQsIGksIGEpID0+IGEuaW5kZXhPZihkKSA9PT0gaSk7XG4gIGxldCBjb2xvckRvbWFpbiA9IHVuaXF1ZVZhbHVlcztcblxuICBsZXQgY29sb3JTY2hlbWUgPSBkMy5zY2hlbWVTZXQxO1xuICBsZXQgY29sb3JJbnRlcnBvbGF0b3IgPSBkMy5pbnRlcnBvbGF0ZVJkQnU7XG5cbiAgaWYgKGRhdGFUeXBlID09PSAnbnVtYmVyJykge1xuICAgIGNvbnN0IFttaW4sIG1heF0gPSBkMy5leHRlbnQodW5pcXVlVmFsdWVzKTtcbiAgICBsZXQgY29sb3JJbnRlcnBvbGF0b3JGbiA9IGQzLmludGVycG9sYXRlQmx1ZXM7XG4gICAgaWYgKG1pbiA8IDAgJiYgbWF4ID4gMCkge1xuICAgICAgY29sb3JJbnRlcnBvbGF0b3JGbiA9IGQzLmludGVycG9sYXRlUmRCdTtcbiAgICB9XG4gICAgLy8gY29sb3JJbnRlcnBvbGF0b3JGbiA9IGQzLmludGVycG9sYXRlUmRCdTtcbiAgICBjb25zdCBjb2xvckludGVycG9sYXRvckxpbWl0ZXJTY2FsZSA9IGQzXG4gICAgICAuc2NhbGVMaW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCwgMV0pXG4gICAgICAucmFuZ2UoWzAuMTUsIDEgLSAwLjE1XSk7XG4gICAgY29sb3JJbnRlcnBvbGF0b3IgPSBrID0+XG4gICAgICBjb2xvckludGVycG9sYXRvckZuKGNvbG9ySW50ZXJwb2xhdG9yTGltaXRlclNjYWxlKGspKTtcblxuICAgIGlmICh1bmlxdWVWYWx1ZXMubGVuZ3RoIDw9IDkpIHtcbiAgICAgIHNjYWxlVHlwZSA9ICdvcmRpbmFsJztcbiAgICAgIC8vIGNvbG9yU2NoZW1lID0gZDMuc2NoZW1lQmx1ZXNbTWF0aC5tYXgoMywgdW5pcXVlVmFsdWVzLmxlbmd0aCldO1xuICAgICAgY29sb3JTY2hlbWUgPSB1bmlxdWVWYWx1ZXMubWFwKGQgPT4gY29sb3JJbnRlcnBvbGF0b3IoKGQgLSBtaW4pIC8gbWF4KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjYWxlVHlwZSA9ICdzZXF1ZW50aWFsJztcbiAgICAgIGNvbG9yRG9tYWluID0gZDMuZXh0ZW50KHVuaXF1ZVZhbHVlcyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHNjYWxlVHlwZSA9PT0gJ29yZGluYWwnKSB7XG4gICAgY29uc29sZS5sb2coJ3VzaW5nIG9yZGluYWwgc2NhbGUnKTtcbiAgICBjb2xvclNjYWxlID0gZDNcbiAgICAgIC5zY2FsZU9yZGluYWwoKVxuICAgICAgLmRvbWFpbihjb2xvckRvbWFpbilcbiAgICAgIC5yYW5nZShjb2xvclNjaGVtZSk7XG4gIH0gZWxzZSBpZiAoc2NhbGVUeXBlID09PSAnc2VxdWVudGlhbCcpIHtcbiAgICBjb25zb2xlLmxvZygndXNpbmcgbGluZWFyIHNjYWxlJywgY29sb3JEb21haW4sIGNvbG9yU2NoZW1lKTtcbiAgICBjb2xvclNjYWxlID0gZDNcbiAgICAgIC5zY2FsZVNlcXVlbnRpYWwoKVxuICAgICAgLmRvbWFpbihjb2xvckRvbWFpbilcbiAgICAgIC5pbnRlcnBvbGF0b3IoY29sb3JJbnRlcnBvbGF0b3IpO1xuICB9XG5cbiAgaWYgKGNvbG9yRG9tYWluLmxlbmd0aCA9PT0gMCAmJiBzY2FsZVR5cGUgPT09ICdvcmRpbmFsJykge1xuICAgIGNvbG9yU2NhbGUgPSBkID0+IHRoaXMucmFuZ2VWYWx1ZXNbMF07XG4gICAgY29sb3JTY2FsZS5yYW5nZSA9IGsgPT4ge1xuICAgICAgaWYgKGsgPT0gbnVsbCkgcmV0dXJuIHRoaXMucmFuZ2VWYWx1ZXM7XG4gICAgICB0aGlzLnJhbmdlVmFsdWVzID0gaztcbiAgICB9O1xuICAgIGNvbG9yU2NhbGUuZG9tYWluID0gKCkgPT4gWydBbGwnXTtcbiAgICBjb2xvclNjYWxlLnJhbmdlKFsnIzAwMCddKTtcbiAgfVxuXG4gIGNvbnNvbGUubG9nKCdjb2xvckRvbWFpbiA9JywgY29sb3JEb21haW4pO1xuICBjb25zb2xlLmxvZygnZ290IGNvbG9yRGF0YScsIGRhdGFUeXBlLCBjb2xvckRhdGEpO1xuXG4gIGlmIChjb2xvclNjYWxlLnJhbmdlICYmIGNvbG9yUmFuZ2VPdmVycmlkZXMpIHtcbiAgICBjb25zb2xlLmxvZygnYXBwbHlpbmcgY29sb3Igb3ZlcnJpZGVzJywgY29sb3JSYW5nZU92ZXJyaWRlcyk7XG4gICAgY29uc3QgbmV3UmFuZ2UgPSBjb2xvclNjYWxlLnJhbmdlKCkuc2xpY2UoKTtcbiAgICBuZXdSYW5nZS5mb3JFYWNoKChkLCBpKSA9PiB7XG4gICAgICBjb25zdCBjb2xvciA9IGNvbG9yUmFuZ2VPdmVycmlkZXNbaV07XG4gICAgICBpZiAoY29sb3IgIT0gbnVsbCkge1xuICAgICAgICBuZXdSYW5nZVtpXSA9IGNvbG9yO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbG9yU2NhbGUucmFuZ2UobmV3UmFuZ2UpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlckNvbnRyb2xzKCkge1xuICBjb25zb2xlLmxvZygncmVuZGVyIGNvbnRyb2xzJyk7XG4gIGQzLnNlbGVjdCgnI3JlYWQtY3N2LWJ0bicpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICB0cmVlRnJvbUNzdlRleHRBcmVhKCk7XG4gICAgcmVuZGVyKCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc1NwZWNpYWwoZCkge1xuICByZXR1cm4gISFkW3NwZWNpYWxLZXldICYmIGRbc3BlY2lhbEtleV0gIT09ICcwJztcbn1cblxuZnVuY3Rpb24gcmVuZGVySGlnaGxpZ2h0KCkge1xuICBjb25zdCBoaWdobGlnaHRDb250YWluZXIgPSByb290Q29udGFpbmVyXG4gICAgLnNlbGVjdCgnLmhpZ2hsaWdodC1jb250YWluZXInKVxuICAgIC5lbXB0eSgpXG4gICAgPyByb290Q29udGFpbmVyXG4gICAgICAgIC5zZWxlY3QoJy52aXMtY29udGFpbmVyJylcbiAgICAgICAgLmFwcGVuZCgnZGl2JylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2hpZ2hsaWdodC1jb250YWluZXInKVxuICAgIDogcm9vdENvbnRhaW5lci5zZWxlY3QoJy5oaWdobGlnaHQtY29udGFpbmVyJyk7XG5cbiAgaWYgKCFoaWdobGlnaHROb2RlKSB7XG4gICAgaGlnaGxpZ2h0Q29udGFpbmVyLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgeyBkYXRhIH0gPSBoaWdobGlnaHROb2RlO1xuICBjb25zdCBoaWdobGlnaHRSb3dIdG1sID0gT2JqZWN0LmtleXMoZGF0YSlcbiAgICAubWFwKFxuICAgICAga2V5ID0+XG4gICAgICAgIGA8dHI+PHRkIGNsYXNzPSdrZXknPiR7a2V5fTwvdGQ+PHRkIGNsYXNzPSd2YWx1ZSc+JHtkYXRhW2tleV19JHtrZXkgPT09XG4gICAgICAgIGNvbG9yS2V5XG4gICAgICAgICAgPyBgPHNwYW4gY2xhc3M9J2NvbG9yLXN3YXRjaCcgc3R5bGU9J2JhY2tncm91bmQ6ICR7Y29sb3JTY2FsZShcbiAgICAgICAgICAgICAgZGF0YVtrZXldXG4gICAgICAgICAgICApfSc+PC9zcGFuPmBcbiAgICAgICAgICA6ICcnfTwvdGQ+PC90cj5gXG4gICAgKVxuICAgIC5qb2luKCcnKTtcblxuICBoaWdobGlnaHRDb250YWluZXJcbiAgICAuc3R5bGUoJ2Rpc3BsYXknLCAnJylcbiAgICAuaHRtbChcbiAgICAgIGA8dGFibGUgY2xhc3M9J25vZGUtdGFibGUnPjx0Ym9keT4ke2hpZ2hsaWdodFJvd0h0bWx9PC90Ym9keT48L3RhYmxlPmBcbiAgICApO1xuXG4gIGNvbnN0IHtcbiAgICB3aWR0aDogaFdpZHRoLFxuICAgIGhlaWdodDogaEhlaWdodCxcbiAgfSA9IGhpZ2hsaWdodENvbnRhaW5lci5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgbGV0IHsgeCwgeSB9ID0gaGlnaGxpZ2h0Tm9kZTtcbiAgeCArPSBwYWRkaW5nLmxlZnQ7XG4gIHkgKz0gcGFkZGluZy50b3A7XG4gIGNvbnN0IGhNYXJnaW4gPSA1O1xuXG4gIGlmICh5ICsgaEhlaWdodCA+IGhlaWdodCkge1xuICAgIHkgLT0gaEhlaWdodDtcbiAgICB5IC09IGhNYXJnaW47XG4gIH0gZWxzZSB7XG4gICAgeSArPSBoTWFyZ2luO1xuICB9XG5cbiAgaWYgKHggKyBoV2lkdGggPiB3aWR0aCkge1xuICAgIHggLT0gaFdpZHRoO1xuICAgIHggLT0gaE1hcmdpbjtcbiAgfSBlbHNlIHtcbiAgICB4ICs9IGhNYXJnaW47XG4gIH1cblxuICB4ID0gTWF0aC5tYXgoMCwgeCk7XG5cbiAgY29uc29sZS5sb2coaGlnaGxpZ2h0Tm9kZSwgeCwgeSk7XG4gIGhpZ2hsaWdodENvbnRhaW5lci5zdHlsZSgndHJhbnNmb3JtJywgYHRyYW5zbGF0ZSgke3h9cHgsICR7eX1weClgKTtcbn1cblxuZnVuY3Rpb24gY29sb3JIZXhTdHJpbmcoc2NhbGVDb2xvcikge1xuICBjb25zdCBjb2xvciA9IGQzLmNvbG9yKHNjYWxlQ29sb3IpO1xuICBsZXQgciA9IGNvbG9yLnIudG9TdHJpbmcoMTYpO1xuICByID0gci5sZW5ndGggPT09IDIgPyByIDogYDAke3J9YDtcbiAgbGV0IGcgPSBjb2xvci5nLnRvU3RyaW5nKDE2KTtcbiAgZyA9IGcubGVuZ3RoID09PSAyID8gZyA6IGAwJHtnfWA7XG4gIGxldCBiID0gY29sb3IuYi50b1N0cmluZygxNik7XG4gIGIgPSBiLmxlbmd0aCA9PT0gMiA/IGIgOiBgMCR7Yn1gO1xuICBjb25zdCBjb2xvclN0ciA9IGAjJHtyfSR7Z30ke2J9YDtcbiAgcmV0dXJuIGNvbG9yU3RyO1xufVxuXG5mdW5jdGlvbiByZW5kZXJMZWdlbmQoKSB7XG4gIC8qKiBMZWdlbmQgKi9cbiAgY29uc3QgbGVnZW5kQ29udGFpbmVyID0gcm9vdENvbnRhaW5lci5zZWxlY3QoJy5sZWdlbmQnKS5lbXB0eSgpXG4gICAgPyByb290Q29udGFpbmVyLmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnbGVnZW5kJylcbiAgICA6IHJvb3RDb250YWluZXIuc2VsZWN0KCcubGVnZW5kJyk7XG5cbiAgY29uc3QgY29sb3JJdGVtcyA9IGNvbG9yU2NhbGUuZG9tYWluKCk7XG4gIGNvbnN0IGxlZ2VuZEJpbmRpbmcgPSBsZWdlbmRDb250YWluZXJcbiAgICAuc2VsZWN0QWxsKCcubGVnZW5kLWl0ZW0nKVxuICAgIC5kYXRhKGNvbG9ySXRlbXMpO1xuICBsZWdlbmRCaW5kaW5nLmV4aXQoKS5yZW1vdmUoKTtcbiAgY29uc3QgbGVnZW5kRW50ZXJpbmcgPSBsZWdlbmRCaW5kaW5nXG4gICAgLmVudGVyKClcbiAgICAuYXBwZW5kKCdzcGFuJylcbiAgICAuYXR0cignY2xhc3MnLCAnbGVnZW5kLWl0ZW0nKVxuICAgIC5lYWNoKGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIGNvbnN0IHJvb3QgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAvLyByb290LnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xuXG4gICAgICBjb25zdCBjb2xvclN0ciA9IGNvbG9ySGV4U3RyaW5nKGNvbG9yU2NhbGUoZCkpO1xuXG4gICAgICByb290XG4gICAgICAgIC5hcHBlbmQoJ2lucHV0JylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZC1pdGVtLWlucHV0JylcbiAgICAgICAgLmF0dHIoJ3R5cGUnLCAnY29sb3InKVxuICAgICAgICAucHJvcGVydHkoJ3ZhbHVlJywgY29sb3JTdHIpXG4gICAgICAgIC5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29uc29sZS5sb2codGhpcy52YWx1ZSwgZCwgaSk7XG4gICAgICAgICAgY29sb3JSYW5nZU92ZXJyaWRlc1tpXSA9IHRoaXMudmFsdWU7XG4gICAgICAgICAgcmVuZGVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICByb290XG4gICAgICAgIC5hcHBlbmQoJ3NwYW4nKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnbGVnZW5kLXN3YXRjaCcpXG4gICAgICAgIC5zdHlsZSgnYmFja2dyb3VuZCcsIGNvbG9yU3RyKTtcbiAgICAgIHJvb3RcbiAgICAgICAgLmFwcGVuZCgnc3BhbicpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdsZWdlbmQtaXRlbS1sYWJlbCcpXG4gICAgICAgIC50ZXh0KGQpO1xuICAgIH0pO1xuXG4gIGNvbnN0IGxlZ2VuZFVwZGF0aW5nID0gbGVnZW5kRW50ZXJpbmdcbiAgICAubWVyZ2UobGVnZW5kQmluZGluZylcbiAgICAuY2xhc3NlZCgnY2FuLW92ZXJyaWRlJywgISFjb2xvclNjYWxlLnJhbmdlKVxuICAgIC5jbGFzc2VkKCduby1vdmVycmlkZScsICFjb2xvclNjYWxlLnJhbmdlKTtcblxuICBsZWdlbmRVcGRhdGluZ1xuICAgIC5zZWxlY3QoJ2lucHV0JylcbiAgICAucHJvcGVydHkoJ3ZhbHVlJywgZCA9PiBjb2xvckhleFN0cmluZyhjb2xvclNjYWxlKGQpKSk7XG4gIGxlZ2VuZFVwZGF0aW5nLnNlbGVjdCgnLmxlZ2VuZC1pdGVtLWxhYmVsJykudGV4dChkID0+IGQpO1xuICBsZWdlbmRVcGRhdGluZ1xuICAgIC5zZWxlY3QoJy5sZWdlbmQtc3dhdGNoJylcbiAgICAuc3R5bGUoJ2JhY2tncm91bmQnLCBkID0+IGNvbG9ySGV4U3RyaW5nKGNvbG9yU2NhbGUoZCkpKTtcblxuICBjb25zdCByZXNldENvbG9yc0J0biA9IGxlZ2VuZENvbnRhaW5lci5zZWxlY3QoJy5yZXNldC1jb2xvcnMtYnRuJykuZW1wdHkoKVxuICAgID8gbGVnZW5kQ29udGFpbmVyXG4gICAgICAgIC5hcHBlbmQoJ2J1dHRvbicpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdyZXNldC1jb2xvcnMtYnRuJylcbiAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKVxuICAgICAgICAub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgIGNvbG9yUmFuZ2VPdmVycmlkZXMgPSBbXTtcbiAgICAgICAgICByZW5kZXIoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoJ1Jlc2V0IENvbG9ycycpXG4gICAgOiBsZWdlbmRDb250YWluZXIuc2VsZWN0KCcucmVzZXQtY29sb3JzLWJ0bicpO1xuXG4gIGlmIChjb2xvclJhbmdlT3ZlcnJpZGVzLmZpbHRlcihkID0+IGQgIT0gbnVsbCkubGVuZ3RoKSB7XG4gICAgcmVzZXRDb2xvcnNCdG4uc3R5bGUoJ2Rpc3BsYXknLCAnJyk7XG4gIH0gZWxzZSB7XG4gICAgcmVzZXRDb2xvcnNCdG4uc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICB9XG5cbiAgcmVzZXRDb2xvcnNCdG4ucmFpc2UoKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyVHJlZSgpIHtcbiAgY29uc29sZS5sb2coJ3JlbmRlciBzdmcgd2l0aCByb290Tm9kZScsIHJvb3ROb2RlKTtcbiAgLy8gcm9vdENvbnRhaW5lci5zZWxlY3QoJ3N2ZycpLnJlbW92ZSgpO1xuICBjb25zdCBub2RlcyA9IHJvb3ROb2RlID8gcm9vdE5vZGUuZGVzY2VuZGFudHMoKSA6IFtdO1xuICBjb25zdCBsaW5rcyA9IHJvb3ROb2RlID8gcm9vdE5vZGUubGlua3MoKSA6IFtdO1xuICBjb25zb2xlLmxvZygncmVuZGVyIHN2ZyB3aXRoIG5vZGVzJywgbm9kZXMpO1xuICBjb25zb2xlLmxvZygncmVuZGVyIHN2ZyB3aXRoIGxpbmtzJywgbGlua3MpO1xuXG4gIC8vIGluaXRpYWxpemUgbWFpbiBTVkdcbiAgY29uc3Qgc3ZnID0gcm9vdENvbnRhaW5lci5zZWxlY3QoJ3N2ZycpLmVtcHR5KClcbiAgICA/IHJvb3RDb250YWluZXIuc2VsZWN0KCcudmlzLWNvbnRhaW5lcicpLmFwcGVuZCgnc3ZnJylcbiAgICA6IHJvb3RDb250YWluZXIuc2VsZWN0KCdzdmcnKTtcblxuICBzdmcuYXR0cignd2lkdGgnLCB3aWR0aCkuYXR0cignaGVpZ2h0JywgaGVpZ2h0KTtcblxuICAvLyB0aGUgbWFpbiA8Zz4gd2hlcmUgYWxsIHRoZSBjaGFydCBjb250ZW50IGdvZXMgaW5zaWRlXG4gIGNvbnN0IGcgPSBzdmcuc2VsZWN0KCcucm9vdC1nJykuZW1wdHkoKVxuICAgID8gc3ZnXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAncm9vdC1nJylcbiAgICAgICAgLmF0dHIoXG4gICAgICAgICAgJ3RyYW5zZm9ybScsXG4gICAgICAgICAgJ3RyYW5zbGF0ZSgnICsgcGFkZGluZy5sZWZ0ICsgJyAnICsgcGFkZGluZy50b3AgKyAnKSdcbiAgICAgICAgKVxuICAgIDogc3ZnLnNlbGVjdCgnLnJvb3QtZycpO1xuXG4gIGNvbnN0IGdMaW5rcyA9IGcuc2VsZWN0KCcubGlua3MnKS5lbXB0eSgpXG4gICAgPyBnLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ2xpbmtzJylcbiAgICA6IGcuc2VsZWN0KCcubGlua3MnKTtcbiAgY29uc3QgZ05vZGVzID0gZy5zZWxlY3QoJy5ub2RlcycpLmVtcHR5KClcbiAgICA/IGcuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnbm9kZXMnKVxuICAgIDogZy5zZWxlY3QoJy5ub2RlcycpO1xuXG4gIC8vIGNvbnN0IGhpZ2hsaWdodExhYmVsID0gZy5zZWxlY3QoJy5oaWdobGlnaHQtbGFiZWwnKS5lbXB0eSgpXG4gIC8vICAgPyBnXG4gIC8vICAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAvLyAgICAgICAuYXR0cignY2xhc3MnLCAnaGlnaGxpZ2h0LWxhYmVsJylcbiAgLy8gICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXG4gIC8vICAgICAgIC5hdHRyKCdkeScsIHBvaW50UmFkaXVzICsgMTgpXG4gIC8vICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCAnNjAwJylcbiAgLy8gICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgLy8gICA6IGcuc2VsZWN0KCcuaGlnaGxpZ2h0LWxhYmVsJyk7XG5cbiAgLy8gcmVuZGVyIG5vZGVzXG4gIGNvbnN0IG5vZGVzQmluZGluZyA9IGdOb2Rlcy5zZWxlY3RBbGwoJy5ub2RlJykuZGF0YShub2RlcywgZCA9PiBkW2lkS2V5XSk7XG4gIG5vZGVzQmluZGluZy5leGl0KCkucmVtb3ZlKCk7XG4gIGNvbnN0IG5vZGVzRW50ZXIgPSBub2Rlc0JpbmRpbmdcbiAgICAuZW50ZXIoKVxuICAgIC5hcHBlbmQoJ2NpcmNsZScpXG4gICAgLmF0dHIoJ2NsYXNzJywgJ25vZGUnKVxuICAgIC5hdHRyKCdyJywgcG9pbnRSYWRpdXMpXG4gICAgLmF0dHIoJ3RyYW5zZm9ybScsIGQgPT4gYHRyYW5zbGF0ZSgke2QueH0gJHtkLnl9KWApXG4gICAgLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZCkge1xuICAgICAgLy8gaGlnaGxpZ2h0TGFiZWxcbiAgICAgIC8vICAgLmF0dHIoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUoJHtkLnh9ICR7ZC55fSlgKVxuICAgICAgLy8gICAudGV4dChKU09OLnN0cmluZ2lmeShkLmRhdGEpKTtcbiAgICAgIGhpZ2hsaWdodE5vZGUgPSBkO1xuICAgICAgcmVuZGVySGlnaGxpZ2h0KCk7XG4gICAgICBkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnaGlnaGxpZ2h0ZWQnLCB0cnVlKTtcbiAgICB9KVxuICAgIC5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgLy8gaGlnaGxpZ2h0TGFiZWwudGV4dCgnJyk7XG4gICAgICBoaWdobGlnaHROb2RlID0gbnVsbDtcbiAgICAgIHJlbmRlckhpZ2hsaWdodCgpO1xuICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgZmFsc2UpO1xuICAgIH0pO1xuXG4gIG5vZGVzRW50ZXJcbiAgICAubWVyZ2Uobm9kZXNCaW5kaW5nKVxuICAgIC5jbGFzc2VkKCdzcGVjaWFsJywgZCA9PiBpc1NwZWNpYWwoZC5kYXRhKSlcbiAgICAuYXR0cihcbiAgICAgICdyJyxcbiAgICAgIGQgPT4gKGlzU3BlY2lhbChkLmRhdGEpID8gc3BlY2lhbFNpemVGYWN0b3IgKiBwb2ludFJhZGl1cyA6IHBvaW50UmFkaXVzKVxuICAgIClcbiAgICAuYXR0cigndHJhbnNmb3JtJywgZCA9PiBgdHJhbnNsYXRlKCR7ZC54fSAke2QueX0pYClcbiAgICAuc3R5bGUoJ2ZpbGwnLCBkID0+IGNvbG9yU2NhbGUoZC5kYXRhW2NvbG9yS2V5XSkpO1xuXG4gIC8vIHJlbmRlciBsaW5rc1xuICBjb25zdCBsaW5rc0JpbmRpbmcgPSBnTGlua3NcbiAgICAuc2VsZWN0QWxsKCcubGluaycpXG4gICAgLmRhdGEobGlua3MsIGQgPT4gYCR7ZC5zb3VyY2VbaWRLZXldfS0tJHtkLnRhcmdldFtpZEtleV19YCk7XG4gIGxpbmtzQmluZGluZy5leGl0KCkucmVtb3ZlKCk7XG5cbiAgY29uc3QgbGlua3NFbnRlciA9IGxpbmtzQmluZGluZ1xuICAgIC5lbnRlcigpXG4gICAgLmFwcGVuZCgnbGluZScpXG4gICAgLmF0dHIoJ2NsYXNzJywgJ2xpbmsnKVxuICAgIC5hdHRyKCd4MScsIGQgPT4gZC5zb3VyY2UueClcbiAgICAuYXR0cigneTEnLCBkID0+IGQuc291cmNlLnkpXG4gICAgLmF0dHIoJ3gyJywgZCA9PiBkLnRhcmdldC54KVxuICAgIC5hdHRyKCd5MicsIGQgPT4gZC50YXJnZXQueSk7XG5cbiAgbGlua3NFbnRlclxuICAgIC5tZXJnZShsaW5rc0JpbmRpbmcpXG4gICAgLmF0dHIoJ3gxJywgZCA9PiBkLnNvdXJjZS54KVxuICAgIC5hdHRyKCd5MScsIGQgPT4gZC5zb3VyY2UueSlcbiAgICAuYXR0cigneDInLCBkID0+IGQudGFyZ2V0LngpXG4gICAgLmF0dHIoJ3kyJywgZCA9PiBkLnRhcmdldC55KVxuICAgIC5zdHlsZSgnc3Ryb2tlJywgZCA9PiBjb2xvclNjYWxlKGQudGFyZ2V0LmRhdGFbY29sb3JLZXldKSk7XG59XG5cbmZ1bmN0aW9uIHRyZWVGcm9tQ3N2VGV4dEFyZWEoKSB7XG4gIGNvbnN0IHRleHQgPSBkMy5zZWxlY3QoJyNjc3YtdGV4dC1pbnB1dCcpLnByb3BlcnR5KCd2YWx1ZScpO1xuICBjc3ZEYXRhID0gZDMuY3N2UGFyc2UodGV4dCk7XG5cbiAgLy8gY2hvb3NlIHNlcXVlbnRpYWwgdmFsdWVzIGlmIGtleSBpcyBub3QgZm91bmQgaW4gdGhlIGNzdlxuICBsZXQgbGFzdFVzZWRDb2x1bW4gPSAwO1xuICBjb25zdCB7IGNvbHVtbnMgfSA9IGNzdkRhdGE7XG4gIGlmICghY29sdW1ucy5pbmNsdWRlcyhpZEtleSkpIHtcbiAgICBpZEtleSA9IGNvbHVtbnNbbGFzdFVzZWRDb2x1bW5dO1xuICAgIGxhc3RVc2VkQ29sdW1uICs9IDE7XG4gIH1cbiAgaWYgKCFjb2x1bW5zLmluY2x1ZGVzKHBhcmVudEtleSkpIHtcbiAgICBwYXJlbnRLZXkgPSBjb2x1bW5zW2xhc3RVc2VkQ29sdW1uXTtcbiAgICBsYXN0VXNlZENvbHVtbiArPSAxO1xuICB9XG4gIGlmICghY29sdW1ucy5pbmNsdWRlcyhjb2xvcktleSkgJiYgY29sb3JLZXkgIT09ICdub25lJykge1xuICAgIGNvbG9yS2V5ID0gY29sdW1uc1tsYXN0VXNlZENvbHVtbl07XG4gICAgbGFzdFVzZWRDb2x1bW4gKz0gMTtcbiAgfVxuICBpZiAoIWNvbHVtbnMuaW5jbHVkZXMoc3BlY2lhbEtleSkgJiYgc3BlY2lhbEtleSAhPT0gJ25vbmUnKSB7XG4gICAgc3BlY2lhbEtleSA9IGNvbHVtbnNbbGFzdFVzZWRDb2x1bW5dO1xuICAgIGxhc3RVc2VkQ29sdW1uICs9IDE7XG4gIH1cblxuICAvLyB0cnkgdG8gY29uc3RydWN0IHRoZSB0cmVlXG4gIHRyeSB7XG4gICAgY29uc3Qgc3RyYXRpZmllciA9IGQzXG4gICAgICAuc3RyYXRpZnkoKVxuICAgICAgLmlkKGQgPT4gZFtpZEtleV0pXG4gICAgICAucGFyZW50SWQoZCA9PiBkW3BhcmVudEtleV0pO1xuICAgIHJvb3ROb2RlID0gc3RyYXRpZmllcihjc3ZEYXRhKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGFsZXJ0KCdFcnJvciBvY2N1cnJlZCBtYWtpbmcgdHJlZTogJyArIGUpO1xuICB9XG5cbiAgLy8gcnVuIHRyZWUgbGF5b3V0XG4gIGNvbnN0IHRyZWUgPSBkMy50cmVlKCkuc2l6ZShbcGxvdEFyZWFXaWR0aCwgcGxvdEFyZWFIZWlnaHRdKTtcbiAgdHJlZShyb290Tm9kZSk7XG5cbiAgY29uc29sZS5sb2coJ2dvdCBjc3ZEYXRhID0nLCBjc3ZEYXRhKTtcbiAgY29uc29sZS5sb2coJ2dvdCByb290Tm9kZSA9Jywgcm9vdE5vZGUpO1xuICBjb25zb2xlLmxvZyhpZEtleSk7XG5cbiAgZnVuY3Rpb24gdXBkYXRlU2VsZWN0KGlkLCBpbml0aWFsVmFsdWUsIHVwZGF0ZUZuLCBpbmNsdWRlTm9uZSkge1xuICAgIC8vIHVwZGF0ZSB0aGUgY29sdW1uIHNlbGVjdHNcbiAgICBjb25zdCBzZWxlY3QgPSBkMy5zZWxlY3QoYCMke2lkfWApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgIHVwZGF0ZUZuKHRoaXMudmFsdWUpO1xuICAgICAgdHJlZUZyb21Dc3ZUZXh0QXJlYSgpO1xuICAgICAgcmVuZGVyKCk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBvcHRpb25CaW5kaW5nID0gc2VsZWN0LnNlbGVjdEFsbCgnb3B0aW9uJykuZGF0YShjc3ZEYXRhLmNvbHVtbnMpO1xuXG4gICAgb3B0aW9uQmluZGluZy5leGl0KCkucmVtb3ZlKCk7XG4gICAgb3B0aW9uQmluZGluZ1xuICAgICAgLmVudGVyKClcbiAgICAgIC5hcHBlbmQoJ29wdGlvbicpXG4gICAgICAubWVyZ2Uob3B0aW9uQmluZGluZylcbiAgICAgIC5wcm9wZXJ0eSgndmFsdWUnLCBkID0+IGQpXG4gICAgICAudGV4dChkID0+IGQpO1xuXG4gICAgaWYgKGluY2x1ZGVOb25lKSB7XG4gICAgICBzZWxlY3RcbiAgICAgICAgLmFwcGVuZCgnb3B0aW9uJylcbiAgICAgICAgLnRleHQoJ25vbmUnKVxuICAgICAgICAucHJvcGVydHkoJ3ZhbHVlJywgJ25vbmUnKVxuICAgICAgICAubG93ZXIoKTtcbiAgICB9XG5cbiAgICBzZWxlY3QucHJvcGVydHkoJ3ZhbHVlJywgaW5pdGlhbFZhbHVlKTtcbiAgfVxuICB1cGRhdGVTZWxlY3QoJ2lkLWtleS1zZWxlY3QnLCBpZEtleSwgdmFsdWUgPT4gKGlkS2V5ID0gdmFsdWUpKTtcbiAgdXBkYXRlU2VsZWN0KCdwYXJlbnQta2V5LXNlbGVjdCcsIHBhcmVudEtleSwgdmFsdWUgPT4gKHBhcmVudEtleSA9IHZhbHVlKSk7XG4gIHVwZGF0ZVNlbGVjdCgnY29sb3Ita2V5LXNlbGVjdCcsIGNvbG9yS2V5LCB2YWx1ZSA9PiAoY29sb3JLZXkgPSB2YWx1ZSksIHRydWUpO1xuICB1cGRhdGVTZWxlY3QoXG4gICAgJ3NwZWNpYWwta2V5LXNlbGVjdCcsXG4gICAgc3BlY2lhbEtleSxcbiAgICB2YWx1ZSA9PiAoc3BlY2lhbEtleSA9IHZhbHVlKSxcbiAgICB0cnVlXG4gICk7XG5cbiAgZDMuc2VsZWN0KCcjd2lkdGgtaW5wdXQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgdXBkYXRlRGltZW5zaW9ucygrdGhpcy52YWx1ZSwgaGVpZ2h0KTtcbiAgICB0cmVlRnJvbUNzdlRleHRBcmVhKCk7XG4gICAgcmVuZGVyKCk7XG4gIH0pO1xuICBkMy5zZWxlY3QoJyNoZWlnaHQtaW5wdXQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgdXBkYXRlRGltZW5zaW9ucyh3aWR0aCwgK3RoaXMudmFsdWUpO1xuICAgIHRyZWVGcm9tQ3N2VGV4dEFyZWEoKTtcbiAgICByZW5kZXIoKTtcbiAgfSk7XG59XG5cbnRyZWVGcm9tQ3N2VGV4dEFyZWEoKTtcbnJlbmRlcigpO1xuIl0sIm5hbWVzIjpbImxldCIsImNvbnN0IiwidGhpcyJdLCJtYXBwaW5ncyI6IkFBQUFBLEdBQUcsQ0FBQyxPQUFPLENBQUM7QUFDWkEsR0FBRyxDQUFDLFFBQVEsQ0FBQztBQUNiQSxHQUFHLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztBQUNyQkEsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7QUFDekJBLEdBQUcsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO0FBQ3pCQSxHQUFHLENBQUMsVUFBVSxHQUFHLGVBQWUsQ0FBQztBQUNqQ0MsR0FBSyxDQUFDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQztBQUM5QkQsR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDbkNBLEdBQUcsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0FBQ3pCQSxHQUFHLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFbENDLEdBQUssQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNO0dBQ3ZDLFNBQVMsQ0FBQyxDQUFDLENBQUM7R0FDWixLQUFLLENBQUMsR0FBRyxDQUFDO0dBQ1YsTUFBTSxXQUFDLEVBQUMsQ0FBQyxTQUFHLENBQUMsS0FBSyxLQUFFLENBQUM7R0FDckIsTUFBTSxVQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxBQUFHO0lBQ3pCQSxHQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1QixPQUFPLE1BQU0sQ0FBQztHQUNmLEVBQUUsRUFBRSxDQUFDLENBQUM7O0FBRVRELEdBQUcsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBQ3pEQSxHQUFHLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQzs7O0FBRzVEQyxHQUFLLENBQUMsT0FBTyxHQUFHO0VBQ2QsR0FBRyxFQUFFLEVBQUU7RUFDUCxLQUFLLEVBQUUsRUFBRTtFQUNULE1BQU0sRUFBRSxFQUFFO0VBQ1YsSUFBSSxFQUFFLEVBQUU7Q0FDVCxDQUFDOzs7QUFHRkQsR0FBRyxDQUFDLGFBQWEsR0FBRyxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBQ3pEQSxHQUFHLENBQUMsY0FBYyxHQUFHLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7O0FBRTNELFNBQVMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM5QixLQUFLLEdBQUcsQ0FBQyxDQUFDO0VBQ1YsTUFBTSxHQUFHLENBQUMsQ0FBQzs7O0VBR1gsYUFBYSxHQUFHLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7RUFDckQsY0FBYyxHQUFHLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7Q0FDeEQ7OztBQUdEQyxHQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQzs7O0FBR3RCQSxHQUFLLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRXpDLFNBQVMsTUFBTSxHQUFHO0VBQ2hCLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLFdBQUMsRUFBQyxDQUFDLFNBQUcsQ0FBQyxDQUFDLE9BQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0VBQzdFLGNBQWMsRUFBRSxDQUFDO0VBQ2pCLFlBQVksRUFBRSxDQUFDO0VBQ2YsVUFBVSxFQUFFLENBQUM7RUFDYixlQUFlLEVBQUUsQ0FBQztDQUNuQjs7QUFFRCxTQUFTLGlCQUFpQixDQUFDLE1BQU0sRUFBRTtFQUNqQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7SUFDakJELEdBQUcsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDOztJQUV0QixLQUFLLGtCQUFhLCtCQUFNLEVBQUU7TUFBckJBLEdBQUcsQ0FBQzs7TUFDUCxJQUFJLFVBQVUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDMUMsVUFBVSxHQUFHLEtBQUssQ0FBQztPQUNwQjtLQUNGOztJQUVELElBQUksVUFBVSxFQUFFO01BQ2QsT0FBTyxRQUFRLENBQUM7S0FDakI7R0FDRjs7O0VBR0QsT0FBTyxRQUFRLENBQUM7Q0FDakI7O0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFOztBQUFDO0VBQ2xEQSxHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLFdBQUMsRUFBQyxDQUFDLFNBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBQyxDQUFDLENBQUMsTUFBTSxXQUFDLEVBQUMsQ0FBQyxTQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUUsQ0FBQyxDQUFDO0VBQzlFQyxHQUFLLENBQUMsUUFBUSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDOztFQUU5Q0QsR0FBRyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7O0VBRTFCLElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRTtJQUN6QixTQUFTLEdBQUcsU0FBUyxDQUFDLEdBQUcsV0FBQyxFQUFDLENBQUMsU0FBRyxVQUFVLENBQUMsQ0FBQyxJQUFDLENBQUMsQ0FBQztJQUM5QyxTQUFTLENBQUMsSUFBSSxVQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFHLENBQUMsR0FBRyxJQUFDLENBQUMsQ0FBQztHQUNqQyxNQUFNO0lBQ0wsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0dBQ2xCOztFQUVEQyxHQUFLLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQyxNQUFNLFVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBQyxDQUFDLENBQUM7RUFDdkVELEdBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDOztFQUUvQkEsR0FBRyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDO0VBQ2hDQSxHQUFHLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQzs7RUFFM0MsSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFO0lBQ3pCLE9BQWdCLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZO0lBQWxDO0lBQUssaUJBQStCO0lBQzNDQSxHQUFHLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDO0lBQzlDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFO01BQ3RCLG1CQUFtQixHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUM7S0FDMUM7O0lBRURDLEdBQUssQ0FBQyw2QkFBNkIsR0FBRyxFQUFFO09BQ3JDLFdBQVcsRUFBRTtPQUNiLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztPQUNkLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzQixpQkFBaUIsYUFBRyxFQUFDLENBQUMsU0FDcEIsbUJBQW1CLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLElBQUMsQ0FBQzs7SUFFeEQsSUFBSSxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtNQUM1QixTQUFTLEdBQUcsU0FBUyxDQUFDOztNQUV0QixXQUFXLEdBQUcsWUFBWSxDQUFDLEdBQUcsV0FBQyxFQUFDLENBQUMsU0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLElBQUMsQ0FBQyxDQUFDO0tBQ3pFLE1BQU07TUFDTCxTQUFTLEdBQUcsWUFBWSxDQUFDO01BQ3pCLFdBQVcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0tBQ3ZDO0dBQ0Y7O0VBRUQsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO0lBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNuQyxVQUFVLEdBQUcsRUFBRTtPQUNaLFlBQVksRUFBRTtPQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUM7T0FDbkIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0dBQ3ZCLE1BQU0sSUFBSSxTQUFTLEtBQUssWUFBWSxFQUFFO0lBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQzVELFVBQVUsR0FBRyxFQUFFO09BQ1osZUFBZSxFQUFFO09BQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUM7T0FDbkIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLENBQUM7R0FDcEM7O0VBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO0lBQ3ZELFVBQVUsYUFBRyxFQUFDLENBQUMsU0FBR0MsTUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUMsQ0FBQztJQUN0QyxVQUFVLENBQUMsS0FBSyxhQUFHLEVBQUMsQ0FBQyxBQUFHO01BQ3RCLElBQUksQ0FBQyxJQUFJLElBQUksSUFBRSxPQUFPQSxNQUFJLENBQUMsV0FBVyxHQUFDO01BQ3ZDQSxNQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztLQUN0QixDQUFDO0lBQ0YsVUFBVSxDQUFDLE1BQU0sWUFBRyxHQUFHLFNBQUcsQ0FBQyxLQUFLLElBQUMsQ0FBQztJQUNsQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztHQUM1Qjs7RUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztFQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7O0VBRWxELElBQUksVUFBVSxDQUFDLEtBQUssSUFBSSxtQkFBbUIsRUFBRTtJQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDN0RELEdBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVDLFFBQVEsQ0FBQyxPQUFPLFVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEFBQUc7TUFDekJBLEdBQUssQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDckMsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1FBQ2pCLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7T0FDckI7S0FDRixDQUFDLENBQUM7SUFDSCxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0dBQzVCO0NBQ0Y7O0FBRUQsU0FBUyxjQUFjLEdBQUc7RUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0VBQy9CLEVBQUUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sV0FBRSxHQUFHLEFBQUc7SUFDM0MsbUJBQW1CLEVBQUUsQ0FBQztJQUN0QixNQUFNLEVBQUUsQ0FBQztHQUNWLENBQUMsQ0FBQztDQUNKOztBQUVELFNBQVMsU0FBUyxDQUFDLENBQUMsRUFBRTtFQUNwQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsQ0FBQztDQUNqRDs7QUFFRCxTQUFTLGVBQWUsR0FBRztFQUN6QkEsR0FBSyxDQUFDLGtCQUFrQixHQUFHLGFBQWE7S0FDckMsTUFBTSxDQUFDLHNCQUFzQixDQUFDO0tBQzlCLEtBQUssRUFBRTtNQUNOLGFBQWE7U0FDVixNQUFNLENBQUMsZ0JBQWdCLENBQUM7U0FDeEIsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUNiLElBQUksQ0FBQyxPQUFPLEVBQUUscUJBQXFCLENBQUM7TUFDdkMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDOztFQUVqRCxJQUFJLENBQUMsYUFBYSxFQUFFO0lBQ2xCLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDNUMsT0FBTztHQUNSO0VBQ0QsQUFBUSw4QkFBdUI7RUFDL0JBLEdBQUssQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztLQUN2QyxHQUFHO2dCQUNGLElBQUcsQ0FBQyxTQUNGLDBCQUF1QixHQUFHLGdDQUEwQixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUcsR0FBRztRQUNuRSxRQUFRO1lBQ0oscURBQWlELFVBQVU7Y0FDekQsSUFBSSxDQUFDLEdBQUcsQ0FBQztjQUNWLGVBQVc7WUFDWixHQUFFLG1CQUFZO0tBQ3JCO0tBQ0EsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDOztFQUVaLGtCQUFrQjtLQUNmLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO0tBQ3BCLElBQUk7TUFDSCx1Q0FBb0MsZ0JBQWdCLHNCQUFrQjtLQUN2RSxDQUFDOztFQUVKLE9BR0MsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUI7RUFGMUM7RUFDQyx5QkFDNEM7O0VBRXRELEFBQU07RUFBRyx3QkFBb0I7RUFDN0IsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUM7RUFDbEIsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUM7RUFDakJBLEdBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDOztFQUVsQixJQUFJLENBQUMsR0FBRyxPQUFPLEdBQUcsTUFBTSxFQUFFO0lBQ3hCLENBQUMsSUFBSSxPQUFPLENBQUM7SUFDYixDQUFDLElBQUksT0FBTyxDQUFDO0dBQ2QsTUFBTTtJQUNMLENBQUMsSUFBSSxPQUFPLENBQUM7R0FDZDs7RUFFRCxJQUFJLENBQUMsR0FBRyxNQUFNLEdBQUcsS0FBSyxFQUFFO0lBQ3RCLENBQUMsSUFBSSxNQUFNLENBQUM7SUFDWixDQUFDLElBQUksT0FBTyxDQUFDO0dBQ2QsTUFBTTtJQUNMLENBQUMsSUFBSSxPQUFPLENBQUM7R0FDZDs7RUFFRCxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7O0VBRW5CLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNqQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLGdCQUFhLENBQUMsWUFBTyxDQUFDLFNBQUssQ0FBQyxDQUFDO0NBQ3BFOztBQUVELFNBQVMsY0FBYyxDQUFDLFVBQVUsRUFBRTtFQUNsQ0EsR0FBSyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0VBQ25DRCxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQzdCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBSSxDQUFDLENBQUUsQ0FBQztFQUNqQ0EsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUM3QixDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQUksQ0FBQyxDQUFFLENBQUM7RUFDakNBLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDN0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFJLENBQUMsQ0FBRSxDQUFDO0VBQ2pDQyxHQUFLLENBQUMsUUFBUSxHQUFHLE1BQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQztFQUNqQyxPQUFPLFFBQVEsQ0FBQztDQUNqQjs7QUFFRCxTQUFTLFlBQVksR0FBRzs7RUFFdEJBLEdBQUssQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUU7TUFDM0QsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztNQUNuRCxhQUFhLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztFQUVwQ0EsR0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7RUFDdkNBLEdBQUssQ0FBQyxhQUFhLEdBQUcsZUFBZTtLQUNsQyxTQUFTLENBQUMsY0FBYyxDQUFDO0tBQ3pCLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztFQUNwQixhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7RUFDOUJBLEdBQUssQ0FBQyxjQUFjLEdBQUcsYUFBYTtLQUNqQyxLQUFLLEVBQUU7S0FDUCxNQUFNLENBQUMsTUFBTSxDQUFDO0tBQ2QsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUM7S0FDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtNQUNuQkEsR0FBSyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7TUFHN0JBLEdBQUssQ0FBQyxRQUFRLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztNQUUvQyxJQUFJO1NBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQztTQUNmLElBQUksQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLENBQUM7U0FDbEMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7U0FDckIsUUFBUSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7U0FDM0IsRUFBRSxDQUFDLFFBQVEsRUFBRSxXQUFXO1VBQ3ZCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7VUFDOUIsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztVQUNwQyxNQUFNLEVBQUUsQ0FBQztTQUNWLENBQUMsQ0FBQzs7TUFFTCxJQUFJO1NBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQztTQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDO1NBQzlCLEtBQUssQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7TUFDakMsSUFBSTtTQUNELE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDZCxJQUFJLENBQUMsT0FBTyxFQUFFLG1CQUFtQixDQUFDO1NBQ2xDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNaLENBQUMsQ0FBQzs7RUFFTEEsR0FBSyxDQUFDLGNBQWMsR0FBRyxjQUFjO0tBQ2xDLEtBQUssQ0FBQyxhQUFhLENBQUM7S0FDcEIsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztLQUMzQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDOztFQUU3QyxjQUFjO0tBQ1gsTUFBTSxDQUFDLE9BQU8sQ0FBQztLQUNmLFFBQVEsQ0FBQyxPQUFPLFlBQUUsRUFBQyxDQUFDLFNBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBQyxDQUFDLENBQUM7RUFDekQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksV0FBQyxFQUFDLENBQUMsU0FBRyxJQUFDLENBQUMsQ0FBQztFQUN6RCxjQUFjO0tBQ1gsTUFBTSxDQUFDLGdCQUFnQixDQUFDO0tBQ3hCLEtBQUssQ0FBQyxZQUFZLFlBQUUsRUFBQyxDQUFDLFNBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBQyxDQUFDLENBQUM7O0VBRTNEQSxHQUFLLENBQUMsY0FBYyxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxLQUFLLEVBQUU7TUFDdEUsZUFBZTtTQUNaLE1BQU0sQ0FBQyxRQUFRLENBQUM7U0FDaEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQztTQUNqQyxLQUFLLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQztTQUN4QixFQUFFLENBQUMsT0FBTyxXQUFFLEdBQUcsQUFBRztVQUNqQixtQkFBbUIsR0FBRyxFQUFFLENBQUM7VUFDekIsTUFBTSxFQUFFLENBQUM7U0FDVixDQUFDO1NBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQztNQUN2QixlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7O0VBRWhELElBQUksbUJBQW1CLENBQUMsTUFBTSxXQUFDLEVBQUMsQ0FBQyxTQUFHLENBQUMsSUFBSSxPQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUU7SUFDckQsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDckMsTUFBTTtJQUNMLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0dBQ3pDOztFQUVELGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztDQUN4Qjs7QUFFRCxTQUFTLFVBQVUsR0FBRztFQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQyxDQUFDOztFQUVsREEsR0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQztFQUNyREEsR0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQztFQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO0VBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7OztFQUc1Q0EsR0FBSyxDQUFDLEdBQUcsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRTtNQUMzQyxhQUFhLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztNQUNwRCxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDOztFQUVoQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDOzs7RUFHaERBLEdBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUU7TUFDbkMsR0FBRztTQUNBLE1BQU0sQ0FBQyxHQUFHLENBQUM7U0FDWCxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztTQUN2QixJQUFJO1VBQ0gsV0FBVztVQUNYLFlBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUc7U0FDdEQ7TUFDSCxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztFQUUxQkEsR0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRTtNQUNyQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO01BQ3BDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDdkJBLEdBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEVBQUU7TUFDckMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztNQUNwQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7O0VBYXZCQSxHQUFLLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBRSxFQUFDLENBQUMsU0FBRyxDQUFDLENBQUMsS0FBSyxJQUFDLENBQUMsQ0FBQztFQUMxRSxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7RUFDN0JBLEdBQUssQ0FBQyxVQUFVLEdBQUcsWUFBWTtLQUM1QixLQUFLLEVBQUU7S0FDUCxNQUFNLENBQUMsUUFBUSxDQUFDO0tBQ2hCLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDO0tBQ3JCLElBQUksQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDO0tBQ3RCLElBQUksQ0FBQyxXQUFXLFlBQUUsRUFBQyxDQUFDLFNBQUcsaUJBQWEsQ0FBQyxDQUFDLEVBQUMsVUFBSSxDQUFDLENBQUMsRUFBQyxVQUFHLENBQUM7S0FDbEQsRUFBRSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsRUFBRTs7OztNQUk1QixhQUFhLEdBQUcsQ0FBQyxDQUFDO01BQ2xCLGVBQWUsRUFBRSxDQUFDO01BQ2xCLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUM5QyxDQUFDO0tBQ0QsRUFBRSxDQUFDLFlBQVksRUFBRSxXQUFXOztNQUUzQixhQUFhLEdBQUcsSUFBSSxDQUFDO01BQ3JCLGVBQWUsRUFBRSxDQUFDO01BQ2xCLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUMvQyxDQUFDLENBQUM7O0VBRUwsVUFBVTtLQUNQLEtBQUssQ0FBQyxZQUFZLENBQUM7S0FDbkIsT0FBTyxDQUFDLFNBQVMsWUFBRSxFQUFDLENBQUMsU0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBQyxDQUFDO0tBQzFDLElBQUk7TUFDSCxHQUFHO2dCQUNILEVBQUMsQ0FBQyxTQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxpQkFBaUIsR0FBRyxXQUFXLEdBQUcsV0FBVyxJQUFDO0tBQ3pFO0tBQ0EsSUFBSSxDQUFDLFdBQVcsWUFBRSxFQUFDLENBQUMsU0FBRyxpQkFBYSxDQUFDLENBQUMsRUFBQyxVQUFJLENBQUMsQ0FBQyxFQUFDLFVBQUcsQ0FBQztLQUNsRCxLQUFLLENBQUMsTUFBTSxZQUFFLEVBQUMsQ0FBQyxTQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFDLENBQUMsQ0FBQzs7O0VBR3BEQSxHQUFLLENBQUMsWUFBWSxHQUFHLE1BQU07S0FDeEIsU0FBUyxDQUFDLE9BQU8sQ0FBQztLQUNsQixJQUFJLENBQUMsS0FBSyxZQUFFLEVBQUMsQ0FBQyxXQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDLFdBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBRSxDQUFDLENBQUM7RUFDOUQsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDOztFQUU3QkEsR0FBSyxDQUFDLFVBQVUsR0FBRyxZQUFZO0tBQzVCLEtBQUssRUFBRTtLQUNQLE1BQU0sQ0FBQyxNQUFNLENBQUM7S0FDZCxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQztLQUNyQixJQUFJLENBQUMsSUFBSSxZQUFFLEVBQUMsQ0FBQyxTQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBQyxDQUFDO0tBQzNCLElBQUksQ0FBQyxJQUFJLFlBQUUsRUFBQyxDQUFDLFNBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFDLENBQUM7S0FDM0IsSUFBSSxDQUFDLElBQUksWUFBRSxFQUFDLENBQUMsU0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUMsQ0FBQztLQUMzQixJQUFJLENBQUMsSUFBSSxZQUFFLEVBQUMsQ0FBQyxTQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBQyxDQUFDLENBQUM7O0VBRS9CLFVBQVU7S0FDUCxLQUFLLENBQUMsWUFBWSxDQUFDO0tBQ25CLElBQUksQ0FBQyxJQUFJLFlBQUUsRUFBQyxDQUFDLFNBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFDLENBQUM7S0FDM0IsSUFBSSxDQUFDLElBQUksWUFBRSxFQUFDLENBQUMsU0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUMsQ0FBQztLQUMzQixJQUFJLENBQUMsSUFBSSxZQUFFLEVBQUMsQ0FBQyxTQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBQyxDQUFDO0tBQzNCLElBQUksQ0FBQyxJQUFJLFlBQUUsRUFBQyxDQUFDLFNBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFDLENBQUM7S0FDM0IsS0FBSyxDQUFDLFFBQVEsWUFBRSxFQUFDLENBQUMsU0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUMsQ0FBQyxDQUFDO0NBQzlEOztBQUVELFNBQVMsbUJB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