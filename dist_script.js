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

d3.select('#dark-mode').on('change', function() {
  darkMode = this.checked;
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzdF9zY3JpcHQuanMiLCJzb3VyY2VzIjpbInNjcmlwdC5qcy0xNTIwMDIwMDM4MTMyIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBjc3ZEYXRhO1xubGV0IHJvb3ROb2RlO1xubGV0IGlkS2V5ID0gJ1NvdXJjZSc7XG5sZXQgcGFyZW50S2V5ID0gJ1RhcmdldCc7XG5sZXQgY29sb3JLZXkgPSAnRW1vdGlvbic7XG5sZXQgc3BlY2lhbEtleSA9ICdJc19JbmZsdWVuY2VyJztcbmNvbnN0IHNwZWNpYWxTaXplRmFjdG9yID0gMS42O1xubGV0IGNvbG9yU2NhbGUgPSBkMy5zY2FsZU9yZGluYWwoKTtcbmxldCBoaWdobGlnaHROb2RlID0gbnVsbDtcbmxldCBjb2xvclJhbmdlT3ZlcnJpZGVzID0gW107XG5sZXQgZGFya01vZGUgPSBmYWxzZTtcblxuY29uc3QgcXVlcnlQYXJhbXMgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoXG4gIC5zdWJzdHJpbmcoMSlcbiAgLnNwbGl0KCcmJylcbiAgLmZpbHRlcihkID0+IGQgIT09ICcnKVxuICAucmVkdWNlKChwYXJhbXMsIHBhcmFtKSA9PiB7XG4gICAgY29uc3QgZW50cnkgPSBwYXJhbS5zcGxpdCgnPScpO1xuICAgIHBhcmFtc1tlbnRyeVswXV0gPSBlbnRyeVsxXTtcbiAgICByZXR1cm4gcGFyYW1zO1xuICB9LCB7fSk7XG5cbmxldCB3aWR0aCA9IHF1ZXJ5UGFyYW1zLndpZHRoID8gK3F1ZXJ5UGFyYW1zLndpZHRoIDogODAwO1xubGV0IGhlaWdodCA9IHF1ZXJ5UGFyYW1zLmhlaWdodCA/ICtxdWVyeVBhcmFtcy5oZWlnaHQgOiA4MDA7XG5cbi8vIHBhZGRpbmcgYXJvdW5kIHRoZSBjaGFydCB3aGVyZSBheGVzIHdpbGwgZ29cbmNvbnN0IHBhZGRpbmcgPSB7XG4gIHRvcDogMjAsXG4gIHJpZ2h0OiAyMCxcbiAgYm90dG9tOiAyMCxcbiAgbGVmdDogMjAsXG59O1xuXG4vLyBpbm5lciBjaGFydCBkaW1lbnNpb25zLCB3aGVyZSB0aGUgZG90cyBhcmUgcGxvdHRlZFxubGV0IHBsb3RBcmVhV2lkdGggPSB3aWR0aCAtIHBhZGRpbmcubGVmdCAtIHBhZGRpbmcucmlnaHQ7XG5sZXQgcGxvdEFyZWFIZWlnaHQgPSBoZWlnaHQgLSBwYWRkaW5nLnRvcCAtIHBhZGRpbmcuYm90dG9tO1xuXG5mdW5jdGlvbiB1cGRhdGVEaW1lbnNpb25zKHcsIGgpIHtcbiAgd2lkdGggPSB3O1xuICBoZWlnaHQgPSBoO1xuXG4gIC8vIGlubmVyIGNoYXJ0IGRpbWVuc2lvbnMsIHdoZXJlIHRoZSBkb3RzIGFyZSBwbG90dGVkXG4gIHBsb3RBcmVhV2lkdGggPSB3aWR0aCAtIHBhZGRpbmcubGVmdCAtIHBhZGRpbmcucmlnaHQ7XG4gIHBsb3RBcmVhSGVpZ2h0ID0gaGVpZ2h0IC0gcGFkZGluZy50b3AgLSBwYWRkaW5nLmJvdHRvbTtcbn1cblxuLy8gcmFkaXVzIG9mIHBvaW50cyBpbiB0aGUgc2NhdHRlcnBsb3RcbmNvbnN0IHBvaW50UmFkaXVzID0gNTtcblxuLy8gc2VsZWN0IHRoZSByb290IGNvbnRhaW5lciB3aGVyZSB0aGUgY2hhcnQgd2lsbCBiZSBhZGRlZFxuY29uc3Qgcm9vdENvbnRhaW5lciA9IGQzLnNlbGVjdCgnI3Jvb3QnKTtcblxuZDMuc2VsZWN0KCcjZGFyay1tb2RlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICBkYXJrTW9kZSA9IHRoaXMuY2hlY2tlZDtcbiAgZDMuc2VsZWN0KCdib2R5JykuY2xhc3NlZCgnZGFyay1tb2RlJywgZGFya01vZGUpO1xufSk7XG5cbmZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgcmVuZGVyQ29sb3JTY2hlbWVTZWxlY3Rvcihyb290Tm9kZS5kZXNjZW5kYW50cygpLm1hcChkID0+IGQuZGF0YSksIGNvbG9yS2V5KTtcbiAgcmVuZGVyQ29udHJvbHMoKTtcbiAgcmVuZGVyTGVnZW5kKCk7XG4gIHJlbmRlclRyZWUoKTtcbiAgcmVuZGVySGlnaGxpZ2h0KCk7XG59XG5cbmZ1bmN0aW9uIGdldFR5cGVGcm9tVmFsdWVzKHZhbHVlcykge1xuICBpZiAodmFsdWVzLmxlbmd0aCkge1xuICAgIGxldCBhbGxOdW1iZXJzID0gdHJ1ZTtcblxuICAgIGZvciAobGV0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgICAgaWYgKGFsbE51bWJlcnMgJiYgaXNOYU4ocGFyc2VGbG9hdCh2YWx1ZSkpKSB7XG4gICAgICAgIGFsbE51bWJlcnMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYWxsTnVtYmVycykge1xuICAgICAgcmV0dXJuICdudW1iZXInO1xuICAgIH1cbiAgfVxuXG4gIC8vIGRlZmF1bHQgdG8gc3RyaW5nXG4gIHJldHVybiAnc3RyaW5nJztcbn1cblxuZnVuY3Rpb24gcmVuZGVyQ29sb3JTY2hlbWVTZWxlY3RvcihkYXRhLCBjb2xvcktleSkge1xuICBsZXQgY29sb3JEYXRhID0gZGF0YS5tYXAoZCA9PiBkW2NvbG9yS2V5XSkuZmlsdGVyKGQgPT4gZCAhPSBudWxsICYmIGQgIT09ICcnKTtcbiAgY29uc3QgZGF0YVR5cGUgPSBnZXRUeXBlRnJvbVZhbHVlcyhjb2xvckRhdGEpO1xuXG4gIGxldCBzY2FsZVR5cGUgPSAnb3JkaW5hbCc7XG4gIC8vIG1ha2UgdGhlIGRhdGEgdGhlIHJpZ2h0IHR5cGUgYW5kIHNvcnQgaXRcbiAgaWYgKGRhdGFUeXBlID09PSAnbnVtYmVyJykge1xuICAgIGNvbG9yRGF0YSA9IGNvbG9yRGF0YS5tYXAoZCA9PiBwYXJzZUZsb2F0KGQpKTtcbiAgICBjb2xvckRhdGEuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICB9IGVsc2Uge1xuICAgIGNvbG9yRGF0YS5zb3J0KCk7XG4gIH1cblxuICBjb25zdCB1bmlxdWVWYWx1ZXMgPSBjb2xvckRhdGEuZmlsdGVyKChkLCBpLCBhKSA9PiBhLmluZGV4T2YoZCkgPT09IGkpO1xuICBsZXQgY29sb3JEb21haW4gPSB1bmlxdWVWYWx1ZXM7XG5cbiAgbGV0IGNvbG9yU2NoZW1lID0gZDMuc2NoZW1lU2V0MTtcbiAgbGV0IGNvbG9ySW50ZXJwb2xhdG9yID0gZDMuaW50ZXJwb2xhdGVSZEJ1O1xuXG4gIGlmIChkYXRhVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICBjb25zdCBbbWluLCBtYXhdID0gZDMuZXh0ZW50KHVuaXF1ZVZhbHVlcyk7XG4gICAgbGV0IGNvbG9ySW50ZXJwb2xhdG9yRm4gPSBkMy5pbnRlcnBvbGF0ZUJsdWVzO1xuICAgIGlmIChtaW4gPCAwICYmIG1heCA+IDApIHtcbiAgICAgIGNvbG9ySW50ZXJwb2xhdG9yRm4gPSBkMy5pbnRlcnBvbGF0ZVJkQnU7XG4gICAgfVxuICAgIC8vIGNvbG9ySW50ZXJwb2xhdG9yRm4gPSBkMy5pbnRlcnBvbGF0ZVJkQnU7XG4gICAgY29uc3QgY29sb3JJbnRlcnBvbGF0b3JMaW1pdGVyU2NhbGUgPSBkM1xuICAgICAgLnNjYWxlTGluZWFyKClcbiAgICAgIC5kb21haW4oWzAsIDFdKVxuICAgICAgLnJhbmdlKFswLjE1LCAxIC0gMC4xNV0pO1xuICAgIGNvbG9ySW50ZXJwb2xhdG9yID0gayA9PlxuICAgICAgY29sb3JJbnRlcnBvbGF0b3JGbihjb2xvckludGVycG9sYXRvckxpbWl0ZXJTY2FsZShrKSk7XG5cbiAgICBpZiAodW5pcXVlVmFsdWVzLmxlbmd0aCA8PSA5KSB7XG4gICAgICBzY2FsZVR5cGUgPSAnb3JkaW5hbCc7XG4gICAgICAvLyBjb2xvclNjaGVtZSA9IGQzLnNjaGVtZUJsdWVzW01hdGgubWF4KDMsIHVuaXF1ZVZhbHVlcy5sZW5ndGgpXTtcbiAgICAgIGNvbG9yU2NoZW1lID0gdW5pcXVlVmFsdWVzLm1hcChkID0+IGNvbG9ySW50ZXJwb2xhdG9yKChkIC0gbWluKSAvIG1heCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FsZVR5cGUgPSAnc2VxdWVudGlhbCc7XG4gICAgICBjb2xvckRvbWFpbiA9IGQzLmV4dGVudCh1bmlxdWVWYWx1ZXMpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzY2FsZVR5cGUgPT09ICdvcmRpbmFsJykge1xuICAgIGNvbnNvbGUubG9nKCd1c2luZyBvcmRpbmFsIHNjYWxlJyk7XG4gICAgY29sb3JTY2FsZSA9IGQzXG4gICAgICAuc2NhbGVPcmRpbmFsKClcbiAgICAgIC5kb21haW4oY29sb3JEb21haW4pXG4gICAgICAucmFuZ2UoY29sb3JTY2hlbWUpO1xuICB9IGVsc2UgaWYgKHNjYWxlVHlwZSA9PT0gJ3NlcXVlbnRpYWwnKSB7XG4gICAgY29uc29sZS5sb2coJ3VzaW5nIGxpbmVhciBzY2FsZScsIGNvbG9yRG9tYWluLCBjb2xvclNjaGVtZSk7XG4gICAgY29sb3JTY2FsZSA9IGQzXG4gICAgICAuc2NhbGVTZXF1ZW50aWFsKClcbiAgICAgIC5kb21haW4oY29sb3JEb21haW4pXG4gICAgICAuaW50ZXJwb2xhdG9yKGNvbG9ySW50ZXJwb2xhdG9yKTtcbiAgfVxuXG4gIGlmIChjb2xvckRvbWFpbi5sZW5ndGggPT09IDAgJiYgc2NhbGVUeXBlID09PSAnb3JkaW5hbCcpIHtcbiAgICBjb2xvclNjYWxlID0gZCA9PiB0aGlzLnJhbmdlVmFsdWVzWzBdO1xuICAgIGNvbG9yU2NhbGUucmFuZ2UgPSBrID0+IHtcbiAgICAgIGlmIChrID09IG51bGwpIHJldHVybiB0aGlzLnJhbmdlVmFsdWVzO1xuICAgICAgdGhpcy5yYW5nZVZhbHVlcyA9IGs7XG4gICAgfTtcbiAgICBjb2xvclNjYWxlLmRvbWFpbiA9ICgpID0+IFsnQWxsJ107XG4gICAgY29sb3JTY2FsZS5yYW5nZShbJyMwMDAnXSk7XG4gIH1cblxuICBjb25zb2xlLmxvZygnY29sb3JEb21haW4gPScsIGNvbG9yRG9tYWluKTtcbiAgY29uc29sZS5sb2coJ2dvdCBjb2xvckRhdGEnLCBkYXRhVHlwZSwgY29sb3JEYXRhKTtcblxuICBpZiAoY29sb3JTY2FsZS5yYW5nZSAmJiBjb2xvclJhbmdlT3ZlcnJpZGVzKSB7XG4gICAgY29uc29sZS5sb2coJ2FwcGx5aW5nIGNvbG9yIG92ZXJyaWRlcycsIGNvbG9yUmFuZ2VPdmVycmlkZXMpO1xuICAgIGNvbnN0IG5ld1JhbmdlID0gY29sb3JTY2FsZS5yYW5nZSgpLnNsaWNlKCk7XG4gICAgbmV3UmFuZ2UuZm9yRWFjaCgoZCwgaSkgPT4ge1xuICAgICAgY29uc3QgY29sb3IgPSBjb2xvclJhbmdlT3ZlcnJpZGVzW2ldO1xuICAgICAgaWYgKGNvbG9yICE9IG51bGwpIHtcbiAgICAgICAgbmV3UmFuZ2VbaV0gPSBjb2xvcjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb2xvclNjYWxlLnJhbmdlKG5ld1JhbmdlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJDb250cm9scygpIHtcbiAgY29uc29sZS5sb2coJ3JlbmRlciBjb250cm9scycpO1xuICBkMy5zZWxlY3QoJyNyZWFkLWNzdi1idG4nKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgdHJlZUZyb21Dc3ZUZXh0QXJlYSgpO1xuICAgIHJlbmRlcigpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaXNTcGVjaWFsKGQpIHtcbiAgcmV0dXJuICEhZFtzcGVjaWFsS2V5XSAmJiBkW3NwZWNpYWxLZXldICE9PSAnMCc7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckhpZ2hsaWdodCgpIHtcbiAgY29uc3QgaGlnaGxpZ2h0Q29udGFpbmVyID0gcm9vdENvbnRhaW5lclxuICAgIC5zZWxlY3QoJy5oaWdobGlnaHQtY29udGFpbmVyJylcbiAgICAuZW1wdHkoKVxuICAgID8gcm9vdENvbnRhaW5lclxuICAgICAgICAuc2VsZWN0KCcudmlzLWNvbnRhaW5lcicpXG4gICAgICAgIC5hcHBlbmQoJ2RpdicpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdoaWdobGlnaHQtY29udGFpbmVyJylcbiAgICA6IHJvb3RDb250YWluZXIuc2VsZWN0KCcuaGlnaGxpZ2h0LWNvbnRhaW5lcicpO1xuXG4gIGlmICghaGlnaGxpZ2h0Tm9kZSkge1xuICAgIGhpZ2hsaWdodENvbnRhaW5lci5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gaGlnaGxpZ2h0Tm9kZTtcbiAgY29uc3QgaGlnaGxpZ2h0Um93SHRtbCA9IE9iamVjdC5rZXlzKGRhdGEpXG4gICAgLm1hcChcbiAgICAgIGtleSA9PlxuICAgICAgICBgPHRyPjx0ZCBjbGFzcz0na2V5Jz4ke2tleX08L3RkPjx0ZCBjbGFzcz0ndmFsdWUnPiR7ZGF0YVtrZXldfSR7a2V5ID09PVxuICAgICAgICBjb2xvcktleVxuICAgICAgICAgID8gYDxzcGFuIGNsYXNzPSdjb2xvci1zd2F0Y2gnIHN0eWxlPSdiYWNrZ3JvdW5kOiAke2NvbG9yU2NhbGUoXG4gICAgICAgICAgICAgIGRhdGFba2V5XVxuICAgICAgICAgICAgKX0nPjwvc3Bhbj5gXG4gICAgICAgICAgOiAnJ308L3RkPjwvdHI+YFxuICAgIClcbiAgICAuam9pbignJyk7XG5cbiAgaGlnaGxpZ2h0Q29udGFpbmVyXG4gICAgLnN0eWxlKCdkaXNwbGF5JywgJycpXG4gICAgLmh0bWwoXG4gICAgICBgPHRhYmxlIGNsYXNzPSdub2RlLXRhYmxlJz48dGJvZHk+JHtoaWdobGlnaHRSb3dIdG1sfTwvdGJvZHk+PC90YWJsZT5gXG4gICAgKTtcblxuICBjb25zdCB7XG4gICAgd2lkdGg6IGhXaWR0aCxcbiAgICBoZWlnaHQ6IGhIZWlnaHQsXG4gIH0gPSBoaWdobGlnaHRDb250YWluZXIubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gIGxldCB7IHgsIHkgfSA9IGhpZ2hsaWdodE5vZGU7XG4gIHggKz0gcGFkZGluZy5sZWZ0O1xuICB5ICs9IHBhZGRpbmcudG9wO1xuICBjb25zdCBoTWFyZ2luID0gNTtcblxuICBpZiAoeSArIGhIZWlnaHQgPiBoZWlnaHQpIHtcbiAgICB5IC09IGhIZWlnaHQ7XG4gICAgeSAtPSBoTWFyZ2luO1xuICB9IGVsc2Uge1xuICAgIHkgKz0gaE1hcmdpbjtcbiAgfVxuXG4gIGlmICh4ICsgaFdpZHRoID4gd2lkdGgpIHtcbiAgICB4IC09IGhXaWR0aDtcbiAgICB4IC09IGhNYXJnaW47XG4gIH0gZWxzZSB7XG4gICAgeCArPSBoTWFyZ2luO1xuICB9XG5cbiAgeCA9IE1hdGgubWF4KDAsIHgpO1xuXG4gIGNvbnNvbGUubG9nKGhpZ2hsaWdodE5vZGUsIHgsIHkpO1xuICBoaWdobGlnaHRDb250YWluZXIuc3R5bGUoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUoJHt4fXB4LCAke3l9cHgpYCk7XG59XG5cbmZ1bmN0aW9uIGNvbG9ySGV4U3RyaW5nKHNjYWxlQ29sb3IpIHtcbiAgY29uc3QgY29sb3IgPSBkMy5jb2xvcihzY2FsZUNvbG9yKTtcbiAgbGV0IHIgPSBjb2xvci5yLnRvU3RyaW5nKDE2KTtcbiAgciA9IHIubGVuZ3RoID09PSAyID8gciA6IGAwJHtyfWA7XG4gIGxldCBnID0gY29sb3IuZy50b1N0cmluZygxNik7XG4gIGcgPSBnLmxlbmd0aCA9PT0gMiA/IGcgOiBgMCR7Z31gO1xuICBsZXQgYiA9IGNvbG9yLmIudG9TdHJpbmcoMTYpO1xuICBiID0gYi5sZW5ndGggPT09IDIgPyBiIDogYDAke2J9YDtcbiAgY29uc3QgY29sb3JTdHIgPSBgIyR7cn0ke2d9JHtifWA7XG4gIHJldHVybiBjb2xvclN0cjtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTGVnZW5kKCkge1xuICAvKiogTGVnZW5kICovXG4gIGNvbnN0IGxlZ2VuZENvbnRhaW5lciA9IHJvb3RDb250YWluZXIuc2VsZWN0KCcubGVnZW5kJykuZW1wdHkoKVxuICAgID8gcm9vdENvbnRhaW5lci5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZCcpXG4gICAgOiByb290Q29udGFpbmVyLnNlbGVjdCgnLmxlZ2VuZCcpO1xuXG4gIGNvbnN0IGNvbG9ySXRlbXMgPSBjb2xvclNjYWxlLmRvbWFpbigpO1xuICBjb25zdCBsZWdlbmRCaW5kaW5nID0gbGVnZW5kQ29udGFpbmVyXG4gICAgLnNlbGVjdEFsbCgnLmxlZ2VuZC1pdGVtJylcbiAgICAuZGF0YShjb2xvckl0ZW1zKTtcbiAgbGVnZW5kQmluZGluZy5leGl0KCkucmVtb3ZlKCk7XG4gIGNvbnN0IGxlZ2VuZEVudGVyaW5nID0gbGVnZW5kQmluZGluZ1xuICAgIC5lbnRlcigpXG4gICAgLmFwcGVuZCgnc3BhbicpXG4gICAgLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZC1pdGVtJylcbiAgICAuZWFjaChmdW5jdGlvbihkLCBpKSB7XG4gICAgICBjb25zdCByb290ID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgLy8gcm9vdC5zZWxlY3RBbGwoJyonKS5yZW1vdmUoKTtcblxuICAgICAgY29uc3QgY29sb3JTdHIgPSBjb2xvckhleFN0cmluZyhjb2xvclNjYWxlKGQpKTtcblxuICAgICAgcm9vdFxuICAgICAgICAuYXBwZW5kKCdpbnB1dCcpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdsZWdlbmQtaXRlbS1pbnB1dCcpXG4gICAgICAgIC5hdHRyKCd0eXBlJywgJ2NvbG9yJylcbiAgICAgICAgLnByb3BlcnR5KCd2YWx1ZScsIGNvbG9yU3RyKVxuICAgICAgICAub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMudmFsdWUsIGQsIGkpO1xuICAgICAgICAgIGNvbG9yUmFuZ2VPdmVycmlkZXNbaV0gPSB0aGlzLnZhbHVlO1xuICAgICAgICAgIHJlbmRlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgcm9vdFxuICAgICAgICAuYXBwZW5kKCdzcGFuJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZC1zd2F0Y2gnKVxuICAgICAgICAuc3R5bGUoJ2JhY2tncm91bmQnLCBjb2xvclN0cik7XG4gICAgICByb290XG4gICAgICAgIC5hcHBlbmQoJ3NwYW4nKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnbGVnZW5kLWl0ZW0tbGFiZWwnKVxuICAgICAgICAudGV4dChkKTtcbiAgICB9KTtcblxuICBjb25zdCBsZWdlbmRVcGRhdGluZyA9IGxlZ2VuZEVudGVyaW5nXG4gICAgLm1lcmdlKGxlZ2VuZEJpbmRpbmcpXG4gICAgLmNsYXNzZWQoJ2Nhbi1vdmVycmlkZScsICEhY29sb3JTY2FsZS5yYW5nZSlcbiAgICAuY2xhc3NlZCgnbm8tb3ZlcnJpZGUnLCAhY29sb3JTY2FsZS5yYW5nZSk7XG5cbiAgbGVnZW5kVXBkYXRpbmdcbiAgICAuc2VsZWN0KCdpbnB1dCcpXG4gICAgLnByb3BlcnR5KCd2YWx1ZScsIGQgPT4gY29sb3JIZXhTdHJpbmcoY29sb3JTY2FsZShkKSkpO1xuICBsZWdlbmRVcGRhdGluZy5zZWxlY3QoJy5sZWdlbmQtaXRlbS1sYWJlbCcpLnRleHQoZCA9PiBkKTtcbiAgbGVnZW5kVXBkYXRpbmdcbiAgICAuc2VsZWN0KCcubGVnZW5kLXN3YXRjaCcpXG4gICAgLnN0eWxlKCdiYWNrZ3JvdW5kJywgZCA9PiBjb2xvckhleFN0cmluZyhjb2xvclNjYWxlKGQpKSk7XG5cbiAgY29uc3QgcmVzZXRDb2xvcnNCdG4gPSBsZWdlbmRDb250YWluZXIuc2VsZWN0KCcucmVzZXQtY29sb3JzLWJ0bicpLmVtcHR5KClcbiAgICA/IGxlZ2VuZENvbnRhaW5lclxuICAgICAgICAuYXBwZW5kKCdidXR0b24nKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAncmVzZXQtY29sb3JzLWJ0bicpXG4gICAgICAgIC5zdHlsZSgnZGlzcGxheScsICdub25lJylcbiAgICAgICAgLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICBjb2xvclJhbmdlT3ZlcnJpZGVzID0gW107XG4gICAgICAgICAgcmVuZGVyKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC50ZXh0KCdSZXNldCBDb2xvcnMnKVxuICAgIDogbGVnZW5kQ29udGFpbmVyLnNlbGVjdCgnLnJlc2V0LWNvbG9ycy1idG4nKTtcblxuICBpZiAoY29sb3JSYW5nZU92ZXJyaWRlcy5maWx0ZXIoZCA9PiBkICE9IG51bGwpLmxlbmd0aCkge1xuICAgIHJlc2V0Q29sb3JzQnRuLnN0eWxlKCdkaXNwbGF5JywgJycpO1xuICB9IGVsc2Uge1xuICAgIHJlc2V0Q29sb3JzQnRuLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgfVxuXG4gIHJlc2V0Q29sb3JzQnRuLnJhaXNlKCk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRyZWUoKSB7XG4gIGNvbnNvbGUubG9nKCdyZW5kZXIgc3ZnIHdpdGggcm9vdE5vZGUnLCByb290Tm9kZSk7XG4gIC8vIHJvb3RDb250YWluZXIuc2VsZWN0KCdzdmcnKS5yZW1vdmUoKTtcbiAgY29uc3Qgbm9kZXMgPSByb290Tm9kZSA/IHJvb3ROb2RlLmRlc2NlbmRhbnRzKCkgOiBbXTtcbiAgY29uc3QgbGlua3MgPSByb290Tm9kZSA/IHJvb3ROb2RlLmxpbmtzKCkgOiBbXTtcbiAgY29uc29sZS5sb2coJ3JlbmRlciBzdmcgd2l0aCBub2RlcycsIG5vZGVzKTtcbiAgY29uc29sZS5sb2coJ3JlbmRlciBzdmcgd2l0aCBsaW5rcycsIGxpbmtzKTtcblxuICAvLyBpbml0aWFsaXplIG1haW4gU1ZHXG4gIGNvbnN0IHN2ZyA9IHJvb3RDb250YWluZXIuc2VsZWN0KCdzdmcnKS5lbXB0eSgpXG4gICAgPyByb290Q29udGFpbmVyLnNlbGVjdCgnLnZpcy1jb250YWluZXInKS5hcHBlbmQoJ3N2ZycpXG4gICAgOiByb290Q29udGFpbmVyLnNlbGVjdCgnc3ZnJyk7XG5cbiAgc3ZnLmF0dHIoJ3dpZHRoJywgd2lkdGgpLmF0dHIoJ2hlaWdodCcsIGhlaWdodCk7XG5cbiAgLy8gdGhlIG1haW4gPGc+IHdoZXJlIGFsbCB0aGUgY2hhcnQgY29udGVudCBnb2VzIGluc2lkZVxuICBjb25zdCBnID0gc3ZnLnNlbGVjdCgnLnJvb3QtZycpLmVtcHR5KClcbiAgICA/IHN2Z1xuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3Jvb3QtZycpXG4gICAgICAgIC5hdHRyKFxuICAgICAgICAgICd0cmFuc2Zvcm0nLFxuICAgICAgICAgICd0cmFuc2xhdGUoJyArIHBhZGRpbmcubGVmdCArICcgJyArIHBhZGRpbmcudG9wICsgJyknXG4gICAgICAgIClcbiAgICA6IHN2Zy5zZWxlY3QoJy5yb290LWcnKTtcblxuICBjb25zdCBnTGlua3MgPSBnLnNlbGVjdCgnLmxpbmtzJykuZW1wdHkoKVxuICAgID8gZy5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdsaW5rcycpXG4gICAgOiBnLnNlbGVjdCgnLmxpbmtzJyk7XG4gIGNvbnN0IGdOb2RlcyA9IGcuc2VsZWN0KCcubm9kZXMnKS5lbXB0eSgpXG4gICAgPyBnLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ25vZGVzJylcbiAgICA6IGcuc2VsZWN0KCcubm9kZXMnKTtcblxuICAvLyBjb25zdCBoaWdobGlnaHRMYWJlbCA9IGcuc2VsZWN0KCcuaGlnaGxpZ2h0LWxhYmVsJykuZW1wdHkoKVxuICAvLyAgID8gZ1xuICAvLyAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgLy8gICAgICAgLmF0dHIoJ2NsYXNzJywgJ2hpZ2hsaWdodC1sYWJlbCcpXG4gIC8vICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAvLyAgICAgICAuYXR0cignZHknLCBwb2ludFJhZGl1cyArIDE4KVxuICAvLyAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgJzYwMCcpXG4gIC8vICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gIC8vICAgOiBnLnNlbGVjdCgnLmhpZ2hsaWdodC1sYWJlbCcpO1xuXG4gIC8vIHJlbmRlciBub2Rlc1xuICBjb25zdCBub2Rlc0JpbmRpbmcgPSBnTm9kZXMuc2VsZWN0QWxsKCcubm9kZScpLmRhdGEobm9kZXMsIGQgPT4gZFtpZEtleV0pO1xuICBub2Rlc0JpbmRpbmcuZXhpdCgpLnJlbW92ZSgpO1xuICBjb25zdCBub2Rlc0VudGVyID0gbm9kZXNCaW5kaW5nXG4gICAgLmVudGVyKClcbiAgICAuYXBwZW5kKCdjaXJjbGUnKVxuICAgIC5hdHRyKCdjbGFzcycsICdub2RlJylcbiAgICAuYXR0cigncicsIHBvaW50UmFkaXVzKVxuICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBkID0+IGB0cmFuc2xhdGUoJHtkLnh9ICR7ZC55fSlgKVxuICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIC8vIGhpZ2hsaWdodExhYmVsXG4gICAgICAvLyAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlKCR7ZC54fSAke2QueX0pYClcbiAgICAgIC8vICAgLnRleHQoSlNPTi5zdHJpbmdpZnkoZC5kYXRhKSk7XG4gICAgICBoaWdobGlnaHROb2RlID0gZDtcbiAgICAgIHJlbmRlckhpZ2hsaWdodCgpO1xuICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgdHJ1ZSk7XG4gICAgfSlcbiAgICAub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGhpZ2hsaWdodExhYmVsLnRleHQoJycpO1xuICAgICAgaGlnaGxpZ2h0Tm9kZSA9IG51bGw7XG4gICAgICByZW5kZXJIaWdobGlnaHQoKTtcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdoaWdobGlnaHRlZCcsIGZhbHNlKTtcbiAgICB9KTtcblxuICBub2Rlc0VudGVyXG4gICAgLm1lcmdlKG5vZGVzQmluZGluZylcbiAgICAuY2xhc3NlZCgnc3BlY2lhbCcsIGQgPT4gaXNTcGVjaWFsKGQuZGF0YSkpXG4gICAgLmF0dHIoXG4gICAgICAncicsXG4gICAgICBkID0+IChpc1NwZWNpYWwoZC5kYXRhKSA/IHNwZWNpYWxTaXplRmFjdG9yICogcG9pbnRSYWRpdXMgOiBwb2ludFJhZGl1cylcbiAgICApXG4gICAgLmF0dHIoJ3RyYW5zZm9ybScsIGQgPT4gYHRyYW5zbGF0ZSgke2QueH0gJHtkLnl9KWApXG4gICAgLnN0eWxlKCdmaWxsJywgZCA9PiBjb2xvclNjYWxlKGQuZGF0YVtjb2xvcktleV0pKTtcblxuICAvLyByZW5kZXIgbGlua3NcbiAgY29uc3QgbGlua3NCaW5kaW5nID0gZ0xpbmtzXG4gICAgLnNlbGVjdEFsbCgnLmxpbmsnKVxuICAgIC5kYXRhKGxpbmtzLCBkID0+IGAke2Quc291cmNlW2lkS2V5XX0tLSR7ZC50YXJnZXRbaWRLZXldfWApO1xuICBsaW5rc0JpbmRpbmcuZXhpdCgpLnJlbW92ZSgpO1xuXG4gIGNvbnN0IGxpbmtzRW50ZXIgPSBsaW5rc0JpbmRpbmdcbiAgICAuZW50ZXIoKVxuICAgIC5hcHBlbmQoJ2xpbmUnKVxuICAgIC5hdHRyKCdjbGFzcycsICdsaW5rJylcbiAgICAuYXR0cigneDEnLCBkID0+IGQuc291cmNlLngpXG4gICAgLmF0dHIoJ3kxJywgZCA9PiBkLnNvdXJjZS55KVxuICAgIC5hdHRyKCd4MicsIGQgPT4gZC50YXJnZXQueClcbiAgICAuYXR0cigneTInLCBkID0+IGQudGFyZ2V0LnkpO1xuXG4gIGxpbmtzRW50ZXJcbiAgICAubWVyZ2UobGlua3NCaW5kaW5nKVxuICAgIC5hdHRyKCd4MScsIGQgPT4gZC5zb3VyY2UueClcbiAgICAuYXR0cigneTEnLCBkID0+IGQuc291cmNlLnkpXG4gICAgLmF0dHIoJ3gyJywgZCA9PiBkLnRhcmdldC54KVxuICAgIC5hdHRyKCd5MicsIGQgPT4gZC50YXJnZXQueSlcbiAgICAuc3R5bGUoJ3N0cm9rZScsIGQgPT4gY29sb3JTY2FsZShkLnRhcmdldC5kYXRhW2NvbG9yS2V5XSkpO1xufVxuXG5mdW5jdGlvbiB0cmVlRnJvbUNzdlRleHRBcmVhKCkge1xuICBjb25zdCB0ZXh0ID0gZDMuc2VsZWN0KCcjY3N2LXRleHQtaW5wdXQnKS5wcm9wZXJ0eSgndmFsdWUnKTtcbiAgY3N2RGF0YSA9IGQzLmNzdlBhcnNlKHRleHQpO1xuXG4gIC8vIGNob29zZSBzZXF1ZW50aWFsIHZhbHVlcyBpZiBrZXkgaXMgbm90IGZvdW5kIGluIHRoZSBjc3ZcbiAgbGV0IGxhc3RVc2VkQ29sdW1uID0gMDtcbiAgY29uc3QgeyBjb2x1bW5zIH0gPSBjc3ZEYXRhO1xuICBpZiAoIWNvbHVtbnMuaW5jbHVkZXMoaWRLZXkpKSB7XG4gICAgaWRLZXkgPSBjb2x1bW5zW2xhc3RVc2VkQ29sdW1uXTtcbiAgICBsYXN0VXNlZENvbHVtbiArPSAxO1xuICB9XG4gIGlmICghY29sdW1ucy5pbmNsdWRlcyhwYXJlbnRLZXkpKSB7XG4gICAgcGFyZW50S2V5ID0gY29sdW1uc1tsYXN0VXNlZENvbHVtbl07XG4gICAgbGFzdFVzZWRDb2x1bW4gKz0gMTtcbiAgfVxuICBpZiAoIWNvbHVtbnMuaW5jbHVkZXMoY29sb3JLZXkpICYmIGNvbG9yS2V5ICE9PSAnbm9uZScpIHtcbiAgICBjb2xvcktleSA9IGNvbHVtbnNbbGFzdFVzZWRDb2x1bW5dO1xuICAgIGxhc3RVc2VkQ29sdW1uICs9IDE7XG4gIH1cbiAgaWYgKCFjb2x1bW5zLmluY2x1ZGVzKHNwZWNpYWxLZXkpICYmIHNwZWNpYWxLZXkgIT09ICdub25lJykge1xuICAgIHNwZWNpYWxLZXkgPSBjb2x1bW5zW2xhc3RVc2VkQ29sdW1uXTtcbiAgICBsYXN0VXNlZENvbHVtbiArPSAxO1xuICB9XG5cbiAgLy8gdHJ5IHRvIGNvbnN0cnVjdCB0aGUgdHJlZVxuICB0cnkge1xuICAgIGNvbnN0IHN0cmF0aWZpZXIgPSBkM1xuICAgICAgLnN0cmF0aWZ5KClcbiAgICAgIC5pZChkID0+IGRbaWRLZXldKVxuICAgICAgLnBhcmVudElkKGQgPT4gZFtwYXJlbnRLZXldKTtcbiAgICByb290Tm9kZSA9IHN0cmF0aWZpZXIoY3N2RGF0YSk7XG4gICAgZDMuc2VsZWN0KCcjZXJyb3ItbWVzc2FnZScpLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgY29uc3QgZXJyb3JNaXNzaW5nTWF0Y2ggPSBlLm1lc3NhZ2UubWF0Y2goL15taXNzaW5nOiAoLiopLyk7XG4gICAgbGV0IGVycm9yTWVzc2FnZSA9IGUubWVzc2FnZTtcbiAgICBpZiAoZXJyb3JNaXNzaW5nTWF0Y2gpIHtcbiAgICAgIGVycm9yTWVzc2FnZSA9IGBDb3VsZCBub3QgZmluZCBwYXJlbnQgbm9kZSB3aXRoIElEIFwiJHtlcnJvck1pc3NpbmdNYXRjaFsxXX1cIi4gRGlkIHlvdSBzZWxlY3QgdGhlIHJpZ2h0IFBhcmVudCBjb2x1bW4/IEl0IGlzIGN1cnJlbnRseSBzZXQgdG8gJHtwYXJlbnRLZXl9LmA7XG4gICAgfSBlbHNlIGlmIChlLm1lc3NhZ2UgPT09ICdubyByb290Jykge1xuICAgICAgZXJyb3JNZXNzYWdlID0gYENvdWxkIG5vdCBmaW5kIGEgbm9kZSB3aXRoIG5vIHBhcmVudC4gVGhlIHBhcmVudCBJRCBjb2x1bW4gKGN1cnJlbnRseSAke3BhcmVudEtleX0pIHNob3VsZCBiZSBlbXB0eSBmb3IgdGhlIHJvb3Qgbm9kZSBvZiB0aGUgdHJlZS5gO1xuICAgIH0gZWxzZSBpZiAoZS5tZXNzYWdlID09PSAnbXVsdGlwbGUgcm9vdHMnKSB7XG4gICAgICBlcnJvck1lc3NhZ2UgPSBgTXVsdGlwbGUgbm9kZXMgaGFkIG5vIHBhcmVudCBzZXQuIFRoZXJlIGNhbiBvbmx5IGJlIG9uZSByb290IG5vZGUuIEVuc3VyZSBlYWNoIG5vZGUgaGFzIGEgcGFyZW50IElEIGJlc2lkZXMgdGhlIHJvb3QuIFRoZSBjdXJyZW50IHBhcmVudCBjb2x1bW4gaXMgJHtwYXJlbnRLZXl9LmA7XG4gICAgfSBlbHNlIGlmIChlLm1lc3NhZ2UgPT09ICdjeWNsZScpIHtcbiAgICAgIGVycm9yTWVzc2FnZSA9IGBEZXRlY3RlZCBhIGN5Y2xlIGluIHRoZSB0cmVlLiBJbnNwZWN0IHBhcmVudCBJRHMgdG8gZW5zdXJlIG5vIGN5Y2xlcyBleGlzdCBpbiB0aGUgZGF0YS4gVGhlIGN1cnJlbnQgcGFyZW50IElEIGNvbHVtbiBpcyAke3BhcmVudEtleX0uYDtcbiAgICB9XG4gICAgZDNcbiAgICAgIC5zZWxlY3QoJyNlcnJvci1tZXNzYWdlJylcbiAgICAgIC5zdHlsZSgnZGlzcGxheScsICcnKVxuICAgICAgLnNlbGVjdCgnLmVycm9yLWRldGFpbHMnKVxuICAgICAgLnRleHQoZXJyb3JNZXNzYWdlKTtcbiAgfVxuXG4gIC8vIHJ1biB0cmVlIGxheW91dFxuICBjb25zdCB0cmVlID0gZDMudHJlZSgpLnNpemUoW3Bsb3RBcmVhV2lkdGgsIHBsb3RBcmVhSGVpZ2h0XSk7XG4gIHRyZWUocm9vdE5vZGUpO1xuXG4gIGNvbnNvbGUubG9nKCdnb3QgY3N2RGF0YSA9JywgY3N2RGF0YSk7XG4gIGNvbnNvbGUubG9nKCdnb3Qgcm9vdE5vZGUgPScsIHJvb3ROb2RlKTtcbiAgY29uc29sZS5sb2coaWRLZXkpO1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZVNlbGVjdChpZCwgaW5pdGlhbFZhbHVlLCB1cGRhdGVGbiwgaW5jbHVkZU5vbmUpIHtcbiAgICAvLyB1cGRhdGUgdGhlIGNvbHVtbiBzZWxlY3RzXG4gICAgY29uc3Qgc2VsZWN0ID0gZDMuc2VsZWN0KGAjJHtpZH1gKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICB1cGRhdGVGbih0aGlzLnZhbHVlKTtcbiAgICAgIHRyZWVGcm9tQ3N2VGV4dEFyZWEoKTtcbiAgICAgIHJlbmRlcigpO1xuICAgIH0pO1xuXG4gICAgY29uc3Qgb3B0aW9uQmluZGluZyA9IHNlbGVjdC5zZWxlY3RBbGwoJ29wdGlvbicpLmRhdGEoY3N2RGF0YS5jb2x1bW5zKTtcblxuICAgIG9wdGlvbkJpbmRpbmcuZXhpdCgpLnJlbW92ZSgpO1xuICAgIG9wdGlvbkJpbmRpbmdcbiAgICAgIC5lbnRlcigpXG4gICAgICAuYXBwZW5kKCdvcHRpb24nKVxuICAgICAgLm1lcmdlKG9wdGlvbkJpbmRpbmcpXG4gICAgICAucHJvcGVydHkoJ3ZhbHVlJywgZCA9PiBkKVxuICAgICAgLnRleHQoZCA9PiBkKTtcblxuICAgIGlmIChpbmNsdWRlTm9uZSkge1xuICAgICAgc2VsZWN0XG4gICAgICAgIC5hcHBlbmQoJ29wdGlvbicpXG4gICAgICAgIC50ZXh0KCdub25lJylcbiAgICAgICAgLnByb3BlcnR5KCd2YWx1ZScsICdub25lJylcbiAgICAgICAgLmxvd2VyKCk7XG4gICAgfVxuXG4gICAgc2VsZWN0LnByb3BlcnR5KCd2YWx1ZScsIGluaXRpYWxWYWx1ZSk7XG4gIH1cbiAgdXBkYXRlU2VsZWN0KCdpZC1rZXktc2VsZWN0JywgaWRLZXksIHZhbHVlID0+IChpZEtleSA9IHZhbHVlKSk7XG4gIHVwZGF0ZVNlbGVjdCgncGFyZW50LWtleS1zZWxlY3QnLCBwYXJlbnRLZXksIHZhbHVlID0+IChwYXJlbnRLZXkgPSB2YWx1ZSkpO1xuICB1cGRhdGVTZWxlY3QoJ2NvbG9yLWtleS1zZWxlY3QnLCBjb2xvcktleSwgdmFsdWUgPT4gKGNvbG9yS2V5ID0gdmFsdWUpLCB0cnVlKTtcbiAgdXBkYXRlU2VsZWN0KFxuICAgICdzcGVjaWFsLWtleS1zZWxlY3QnLFxuICAgIHNwZWNpYWxLZXksXG4gICAgdmFsdWUgPT4gKHNwZWNpYWxLZXkgPSB2YWx1ZSksXG4gICAgdHJ1ZVxuICApO1xuXG4gIGQzLnNlbGVjdCgnI3dpZHRoLWlucHV0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHVwZGF0ZURpbWVuc2lvbnMoK3RoaXMudmFsdWUsIGhlaWdodCk7XG4gICAgdHJlZUZyb21Dc3ZUZXh0QXJlYSgpO1xuICAgIHJlbmRlcigpO1xuICB9KTtcbiAgZDMuc2VsZWN0KCcjaGVpZ2h0LWlucHV0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHVwZGF0ZURpbWVuc2lvbnMod2lkdGgsICt0aGlzLnZhbHVlKTtcbiAgICB0cmVlRnJvbUNzdlRleHRBcmVhKCk7XG4gICAgcmVuZGVyKCk7XG4gIH0pO1xufVxuXG50cmVlRnJvbUNzdlRleHRBcmVhKCk7XG5yZW5kZXIoKTtcbiJdLCJuYW1lcyI6WyJsZXQiLCJjb25zdCIsInRoaXMiXSwibWFwcGluZ3MiOiJBQUFBQSxHQUFHLENBQUMsT0FBTyxDQUFDO0FBQ1pBLEdBQUcsQ0FBQyxRQUFRLENBQUM7QUFDYkEsR0FBRyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7QUFDckJBLEdBQUcsQ0FBQyxTQUFTLEdBQUcs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