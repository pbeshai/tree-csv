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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzdF9zY3JpcHQuanMiLCJzb3VyY2VzIjpbInNjcmlwdC5qcy0xNTIwMDE5NjMwMTA4Il0sInNvdXJjZXNDb250ZW50IjpbImxldCBjc3ZEYXRhO1xubGV0IHJvb3ROb2RlO1xubGV0IGlkS2V5ID0gJ1NvdXJjZSc7XG5sZXQgcGFyZW50S2V5ID0gJ1RhcmdldCc7XG5sZXQgY29sb3JLZXkgPSAnRW1vdGlvbic7XG5sZXQgc3BlY2lhbEtleSA9ICdJc19JbmZsdWVuY2VyJztcbmNvbnN0IHNwZWNpYWxTaXplRmFjdG9yID0gMS42O1xubGV0IGNvbG9yU2NhbGUgPSBkMy5zY2FsZU9yZGluYWwoKTtcbmxldCBoaWdobGlnaHROb2RlID0gbnVsbDtcbmxldCBjb2xvclJhbmdlT3ZlcnJpZGVzID0gWydyZWQnXTtcbmxldCBkYXJrTW9kZSA9IGZhbHNlO1xuXG5jb25zdCBxdWVyeVBhcmFtcyA9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2hcbiAgLnN1YnN0cmluZygxKVxuICAuc3BsaXQoJyYnKVxuICAuZmlsdGVyKGQgPT4gZCAhPT0gJycpXG4gIC5yZWR1Y2UoKHBhcmFtcywgcGFyYW0pID0+IHtcbiAgICBjb25zdCBlbnRyeSA9IHBhcmFtLnNwbGl0KCc9Jyk7XG4gICAgcGFyYW1zW2VudHJ5WzBdXSA9IGVudHJ5WzFdO1xuICAgIHJldHVybiBwYXJhbXM7XG4gIH0sIHt9KTtcblxubGV0IHdpZHRoID0gcXVlcnlQYXJhbXMud2lkdGggPyArcXVlcnlQYXJhbXMud2lkdGggOiA4MDA7XG5sZXQgaGVpZ2h0ID0gcXVlcnlQYXJhbXMuaGVpZ2h0ID8gK3F1ZXJ5UGFyYW1zLmhlaWdodCA6IDgwMDtcblxuLy8gcGFkZGluZyBhcm91bmQgdGhlIGNoYXJ0IHdoZXJlIGF4ZXMgd2lsbCBnb1xuY29uc3QgcGFkZGluZyA9IHtcbiAgdG9wOiAyMCxcbiAgcmlnaHQ6IDIwLFxuICBib3R0b206IDIwLFxuICBsZWZ0OiAyMCxcbn07XG5cbi8vIGlubmVyIGNoYXJ0IGRpbWVuc2lvbnMsIHdoZXJlIHRoZSBkb3RzIGFyZSBwbG90dGVkXG5sZXQgcGxvdEFyZWFXaWR0aCA9IHdpZHRoIC0gcGFkZGluZy5sZWZ0IC0gcGFkZGluZy5yaWdodDtcbmxldCBwbG90QXJlYUhlaWdodCA9IGhlaWdodCAtIHBhZGRpbmcudG9wIC0gcGFkZGluZy5ib3R0b207XG5cbmZ1bmN0aW9uIHVwZGF0ZURpbWVuc2lvbnModywgaCkge1xuICB3aWR0aCA9IHc7XG4gIGhlaWdodCA9IGg7XG5cbiAgLy8gaW5uZXIgY2hhcnQgZGltZW5zaW9ucywgd2hlcmUgdGhlIGRvdHMgYXJlIHBsb3R0ZWRcbiAgcGxvdEFyZWFXaWR0aCA9IHdpZHRoIC0gcGFkZGluZy5sZWZ0IC0gcGFkZGluZy5yaWdodDtcbiAgcGxvdEFyZWFIZWlnaHQgPSBoZWlnaHQgLSBwYWRkaW5nLnRvcCAtIHBhZGRpbmcuYm90dG9tO1xufVxuXG4vLyByYWRpdXMgb2YgcG9pbnRzIGluIHRoZSBzY2F0dGVycGxvdFxuY29uc3QgcG9pbnRSYWRpdXMgPSA1O1xuXG4vLyBzZWxlY3QgdGhlIHJvb3QgY29udGFpbmVyIHdoZXJlIHRoZSBjaGFydCB3aWxsIGJlIGFkZGVkXG5jb25zdCByb290Q29udGFpbmVyID0gZDMuc2VsZWN0KCcjcm9vdCcpO1xuXG5kMy5zZWxlY3QoJyNkYXJrLW1vZGUnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICBkYXJrTW9kZSA9ICFkYXJrTW9kZTtcbiAgZDMuc2VsZWN0KCdib2R5JykuY2xhc3NlZCgnZGFyay1tb2RlJywgZGFya01vZGUpO1xufSk7XG5cbmZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgcmVuZGVyQ29sb3JTY2hlbWVTZWxlY3Rvcihyb290Tm9kZS5kZXNjZW5kYW50cygpLm1hcChkID0+IGQuZGF0YSksIGNvbG9yS2V5KTtcbiAgcmVuZGVyQ29udHJvbHMoKTtcbiAgcmVuZGVyTGVnZW5kKCk7XG4gIHJlbmRlclRyZWUoKTtcbiAgcmVuZGVySGlnaGxpZ2h0KCk7XG59XG5cbmZ1bmN0aW9uIGdldFR5cGVGcm9tVmFsdWVzKHZhbHVlcykge1xuICBpZiAodmFsdWVzLmxlbmd0aCkge1xuICAgIGxldCBhbGxOdW1iZXJzID0gdHJ1ZTtcblxuICAgIGZvciAobGV0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgICAgaWYgKGFsbE51bWJlcnMgJiYgaXNOYU4ocGFyc2VGbG9hdCh2YWx1ZSkpKSB7XG4gICAgICAgIGFsbE51bWJlcnMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYWxsTnVtYmVycykge1xuICAgICAgcmV0dXJuICdudW1iZXInO1xuICAgIH1cbiAgfVxuXG4gIC8vIGRlZmF1bHQgdG8gc3RyaW5nXG4gIHJldHVybiAnc3RyaW5nJztcbn1cblxuZnVuY3Rpb24gcmVuZGVyQ29sb3JTY2hlbWVTZWxlY3RvcihkYXRhLCBjb2xvcktleSkge1xuICBsZXQgY29sb3JEYXRhID0gZGF0YS5tYXAoZCA9PiBkW2NvbG9yS2V5XSkuZmlsdGVyKGQgPT4gZCAhPSBudWxsICYmIGQgIT09ICcnKTtcbiAgY29uc3QgZGF0YVR5cGUgPSBnZXRUeXBlRnJvbVZhbHVlcyhjb2xvckRhdGEpO1xuXG4gIGxldCBzY2FsZVR5cGUgPSAnb3JkaW5hbCc7XG4gIC8vIG1ha2UgdGhlIGRhdGEgdGhlIHJpZ2h0IHR5cGUgYW5kIHNvcnQgaXRcbiAgaWYgKGRhdGFUeXBlID09PSAnbnVtYmVyJykge1xuICAgIGNvbG9yRGF0YSA9IGNvbG9yRGF0YS5tYXAoZCA9PiBwYXJzZUZsb2F0KGQpKTtcbiAgICBjb2xvckRhdGEuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICB9IGVsc2Uge1xuICAgIGNvbG9yRGF0YS5zb3J0KCk7XG4gIH1cblxuICBjb25zdCB1bmlxdWVWYWx1ZXMgPSBjb2xvckRhdGEuZmlsdGVyKChkLCBpLCBhKSA9PiBhLmluZGV4T2YoZCkgPT09IGkpO1xuICBsZXQgY29sb3JEb21haW4gPSB1bmlxdWVWYWx1ZXM7XG5cbiAgbGV0IGNvbG9yU2NoZW1lID0gZDMuc2NoZW1lU2V0MTtcbiAgbGV0IGNvbG9ySW50ZXJwb2xhdG9yID0gZDMuaW50ZXJwb2xhdGVSZEJ1O1xuXG4gIGlmIChkYXRhVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICBjb25zdCBbbWluLCBtYXhdID0gZDMuZXh0ZW50KHVuaXF1ZVZhbHVlcyk7XG4gICAgbGV0IGNvbG9ySW50ZXJwb2xhdG9yRm4gPSBkMy5pbnRlcnBvbGF0ZUJsdWVzO1xuICAgIGlmIChtaW4gPCAwICYmIG1heCA+IDApIHtcbiAgICAgIGNvbG9ySW50ZXJwb2xhdG9yRm4gPSBkMy5pbnRlcnBvbGF0ZVJkQnU7XG4gICAgfVxuICAgIC8vIGNvbG9ySW50ZXJwb2xhdG9yRm4gPSBkMy5pbnRlcnBvbGF0ZVJkQnU7XG4gICAgY29uc3QgY29sb3JJbnRlcnBvbGF0b3JMaW1pdGVyU2NhbGUgPSBkM1xuICAgICAgLnNjYWxlTGluZWFyKClcbiAgICAgIC5kb21haW4oWzAsIDFdKVxuICAgICAgLnJhbmdlKFswLjE1LCAxIC0gMC4xNV0pO1xuICAgIGNvbG9ySW50ZXJwb2xhdG9yID0gayA9PlxuICAgICAgY29sb3JJbnRlcnBvbGF0b3JGbihjb2xvckludGVycG9sYXRvckxpbWl0ZXJTY2FsZShrKSk7XG5cbiAgICBpZiAodW5pcXVlVmFsdWVzLmxlbmd0aCA8PSA5KSB7XG4gICAgICBzY2FsZVR5cGUgPSAnb3JkaW5hbCc7XG4gICAgICAvLyBjb2xvclNjaGVtZSA9IGQzLnNjaGVtZUJsdWVzW01hdGgubWF4KDMsIHVuaXF1ZVZhbHVlcy5sZW5ndGgpXTtcbiAgICAgIGNvbG9yU2NoZW1lID0gdW5pcXVlVmFsdWVzLm1hcChkID0+IGNvbG9ySW50ZXJwb2xhdG9yKChkIC0gbWluKSAvIG1heCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FsZVR5cGUgPSAnc2VxdWVudGlhbCc7XG4gICAgICBjb2xvckRvbWFpbiA9IGQzLmV4dGVudCh1bmlxdWVWYWx1ZXMpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzY2FsZVR5cGUgPT09ICdvcmRpbmFsJykge1xuICAgIGNvbnNvbGUubG9nKCd1c2luZyBvcmRpbmFsIHNjYWxlJyk7XG4gICAgY29sb3JTY2FsZSA9IGQzXG4gICAgICAuc2NhbGVPcmRpbmFsKClcbiAgICAgIC5kb21haW4oY29sb3JEb21haW4pXG4gICAgICAucmFuZ2UoY29sb3JTY2hlbWUpO1xuICB9IGVsc2UgaWYgKHNjYWxlVHlwZSA9PT0gJ3NlcXVlbnRpYWwnKSB7XG4gICAgY29uc29sZS5sb2coJ3VzaW5nIGxpbmVhciBzY2FsZScsIGNvbG9yRG9tYWluLCBjb2xvclNjaGVtZSk7XG4gICAgY29sb3JTY2FsZSA9IGQzXG4gICAgICAuc2NhbGVTZXF1ZW50aWFsKClcbiAgICAgIC5kb21haW4oY29sb3JEb21haW4pXG4gICAgICAuaW50ZXJwb2xhdG9yKGNvbG9ySW50ZXJwb2xhdG9yKTtcbiAgfVxuXG4gIGlmIChjb2xvckRvbWFpbi5sZW5ndGggPT09IDAgJiYgc2NhbGVUeXBlID09PSAnb3JkaW5hbCcpIHtcbiAgICBjb2xvclNjYWxlID0gZCA9PiB0aGlzLnJhbmdlVmFsdWVzWzBdO1xuICAgIGNvbG9yU2NhbGUucmFuZ2UgPSBrID0+IHtcbiAgICAgIGlmIChrID09IG51bGwpIHJldHVybiB0aGlzLnJhbmdlVmFsdWVzO1xuICAgICAgdGhpcy5yYW5nZVZhbHVlcyA9IGs7XG4gICAgfTtcbiAgICBjb2xvclNjYWxlLmRvbWFpbiA9ICgpID0+IFsnQWxsJ107XG4gICAgY29sb3JTY2FsZS5yYW5nZShbJyMwMDAnXSk7XG4gIH1cblxuICBjb25zb2xlLmxvZygnY29sb3JEb21haW4gPScsIGNvbG9yRG9tYWluKTtcbiAgY29uc29sZS5sb2coJ2dvdCBjb2xvckRhdGEnLCBkYXRhVHlwZSwgY29sb3JEYXRhKTtcblxuICBpZiAoY29sb3JTY2FsZS5yYW5nZSAmJiBjb2xvclJhbmdlT3ZlcnJpZGVzKSB7XG4gICAgY29uc29sZS5sb2coJ2FwcGx5aW5nIGNvbG9yIG92ZXJyaWRlcycsIGNvbG9yUmFuZ2VPdmVycmlkZXMpO1xuICAgIGNvbnN0IG5ld1JhbmdlID0gY29sb3JTY2FsZS5yYW5nZSgpLnNsaWNlKCk7XG4gICAgbmV3UmFuZ2UuZm9yRWFjaCgoZCwgaSkgPT4ge1xuICAgICAgY29uc3QgY29sb3IgPSBjb2xvclJhbmdlT3ZlcnJpZGVzW2ldO1xuICAgICAgaWYgKGNvbG9yICE9IG51bGwpIHtcbiAgICAgICAgbmV3UmFuZ2VbaV0gPSBjb2xvcjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb2xvclNjYWxlLnJhbmdlKG5ld1JhbmdlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJDb250cm9scygpIHtcbiAgY29uc29sZS5sb2coJ3JlbmRlciBjb250cm9scycpO1xuICBkMy5zZWxlY3QoJyNyZWFkLWNzdi1idG4nKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgdHJlZUZyb21Dc3ZUZXh0QXJlYSgpO1xuICAgIHJlbmRlcigpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaXNTcGVjaWFsKGQpIHtcbiAgcmV0dXJuICEhZFtzcGVjaWFsS2V5XSAmJiBkW3NwZWNpYWxLZXldICE9PSAnMCc7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckhpZ2hsaWdodCgpIHtcbiAgY29uc3QgaGlnaGxpZ2h0Q29udGFpbmVyID0gcm9vdENvbnRhaW5lclxuICAgIC5zZWxlY3QoJy5oaWdobGlnaHQtY29udGFpbmVyJylcbiAgICAuZW1wdHkoKVxuICAgID8gcm9vdENvbnRhaW5lclxuICAgICAgICAuc2VsZWN0KCcudmlzLWNvbnRhaW5lcicpXG4gICAgICAgIC5hcHBlbmQoJ2RpdicpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdoaWdobGlnaHQtY29udGFpbmVyJylcbiAgICA6IHJvb3RDb250YWluZXIuc2VsZWN0KCcuaGlnaGxpZ2h0LWNvbnRhaW5lcicpO1xuXG4gIGlmICghaGlnaGxpZ2h0Tm9kZSkge1xuICAgIGhpZ2hsaWdodENvbnRhaW5lci5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gaGlnaGxpZ2h0Tm9kZTtcbiAgY29uc3QgaGlnaGxpZ2h0Um93SHRtbCA9IE9iamVjdC5rZXlzKGRhdGEpXG4gICAgLm1hcChcbiAgICAgIGtleSA9PlxuICAgICAgICBgPHRyPjx0ZCBjbGFzcz0na2V5Jz4ke2tleX08L3RkPjx0ZCBjbGFzcz0ndmFsdWUnPiR7ZGF0YVtrZXldfSR7a2V5ID09PVxuICAgICAgICBjb2xvcktleVxuICAgICAgICAgID8gYDxzcGFuIGNsYXNzPSdjb2xvci1zd2F0Y2gnIHN0eWxlPSdiYWNrZ3JvdW5kOiAke2NvbG9yU2NhbGUoXG4gICAgICAgICAgICAgIGRhdGFba2V5XVxuICAgICAgICAgICAgKX0nPjwvc3Bhbj5gXG4gICAgICAgICAgOiAnJ308L3RkPjwvdHI+YFxuICAgIClcbiAgICAuam9pbignJyk7XG5cbiAgaGlnaGxpZ2h0Q29udGFpbmVyXG4gICAgLnN0eWxlKCdkaXNwbGF5JywgJycpXG4gICAgLmh0bWwoXG4gICAgICBgPHRhYmxlIGNsYXNzPSdub2RlLXRhYmxlJz48dGJvZHk+JHtoaWdobGlnaHRSb3dIdG1sfTwvdGJvZHk+PC90YWJsZT5gXG4gICAgKTtcblxuICBjb25zdCB7XG4gICAgd2lkdGg6IGhXaWR0aCxcbiAgICBoZWlnaHQ6IGhIZWlnaHQsXG4gIH0gPSBoaWdobGlnaHRDb250YWluZXIubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gIGxldCB7IHgsIHkgfSA9IGhpZ2hsaWdodE5vZGU7XG4gIHggKz0gcGFkZGluZy5sZWZ0O1xuICB5ICs9IHBhZGRpbmcudG9wO1xuICBjb25zdCBoTWFyZ2luID0gNTtcblxuICBpZiAoeSArIGhIZWlnaHQgPiBoZWlnaHQpIHtcbiAgICB5IC09IGhIZWlnaHQ7XG4gICAgeSAtPSBoTWFyZ2luO1xuICB9IGVsc2Uge1xuICAgIHkgKz0gaE1hcmdpbjtcbiAgfVxuXG4gIGlmICh4ICsgaFdpZHRoID4gd2lkdGgpIHtcbiAgICB4IC09IGhXaWR0aDtcbiAgICB4IC09IGhNYXJnaW47XG4gIH0gZWxzZSB7XG4gICAgeCArPSBoTWFyZ2luO1xuICB9XG5cbiAgeCA9IE1hdGgubWF4KDAsIHgpO1xuXG4gIGNvbnNvbGUubG9nKGhpZ2hsaWdodE5vZGUsIHgsIHkpO1xuICBoaWdobGlnaHRDb250YWluZXIuc3R5bGUoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUoJHt4fXB4LCAke3l9cHgpYCk7XG59XG5cbmZ1bmN0aW9uIGNvbG9ySGV4U3RyaW5nKHNjYWxlQ29sb3IpIHtcbiAgY29uc3QgY29sb3IgPSBkMy5jb2xvcihzY2FsZUNvbG9yKTtcbiAgbGV0IHIgPSBjb2xvci5yLnRvU3RyaW5nKDE2KTtcbiAgciA9IHIubGVuZ3RoID09PSAyID8gciA6IGAwJHtyfWA7XG4gIGxldCBnID0gY29sb3IuZy50b1N0cmluZygxNik7XG4gIGcgPSBnLmxlbmd0aCA9PT0gMiA/IGcgOiBgMCR7Z31gO1xuICBsZXQgYiA9IGNvbG9yLmIudG9TdHJpbmcoMTYpO1xuICBiID0gYi5sZW5ndGggPT09IDIgPyBiIDogYDAke2J9YDtcbiAgY29uc3QgY29sb3JTdHIgPSBgIyR7cn0ke2d9JHtifWA7XG4gIHJldHVybiBjb2xvclN0cjtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTGVnZW5kKCkge1xuICAvKiogTGVnZW5kICovXG4gIGNvbnN0IGxlZ2VuZENvbnRhaW5lciA9IHJvb3RDb250YWluZXIuc2VsZWN0KCcubGVnZW5kJykuZW1wdHkoKVxuICAgID8gcm9vdENvbnRhaW5lci5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZCcpXG4gICAgOiByb290Q29udGFpbmVyLnNlbGVjdCgnLmxlZ2VuZCcpO1xuXG4gIGNvbnN0IGNvbG9ySXRlbXMgPSBjb2xvclNjYWxlLmRvbWFpbigpO1xuICBjb25zdCBsZWdlbmRCaW5kaW5nID0gbGVnZW5kQ29udGFpbmVyXG4gICAgLnNlbGVjdEFsbCgnLmxlZ2VuZC1pdGVtJylcbiAgICAuZGF0YShjb2xvckl0ZW1zKTtcbiAgbGVnZW5kQmluZGluZy5leGl0KCkucmVtb3ZlKCk7XG4gIGNvbnN0IGxlZ2VuZEVudGVyaW5nID0gbGVnZW5kQmluZGluZ1xuICAgIC5lbnRlcigpXG4gICAgLmFwcGVuZCgnc3BhbicpXG4gICAgLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZC1pdGVtJylcbiAgICAuZWFjaChmdW5jdGlvbihkLCBpKSB7XG4gICAgICBjb25zdCByb290ID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgLy8gcm9vdC5zZWxlY3RBbGwoJyonKS5yZW1vdmUoKTtcblxuICAgICAgY29uc3QgY29sb3JTdHIgPSBjb2xvckhleFN0cmluZyhjb2xvclNjYWxlKGQpKTtcblxuICAgICAgcm9vdFxuICAgICAgICAuYXBwZW5kKCdpbnB1dCcpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdsZWdlbmQtaXRlbS1pbnB1dCcpXG4gICAgICAgIC5hdHRyKCd0eXBlJywgJ2NvbG9yJylcbiAgICAgICAgLnByb3BlcnR5KCd2YWx1ZScsIGNvbG9yU3RyKVxuICAgICAgICAub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMudmFsdWUsIGQsIGkpO1xuICAgICAgICAgIGNvbG9yUmFuZ2VPdmVycmlkZXNbaV0gPSB0aGlzLnZhbHVlO1xuICAgICAgICAgIHJlbmRlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgcm9vdFxuICAgICAgICAuYXBwZW5kKCdzcGFuJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2xlZ2VuZC1zd2F0Y2gnKVxuICAgICAgICAuc3R5bGUoJ2JhY2tncm91bmQnLCBjb2xvclN0cik7XG4gICAgICByb290XG4gICAgICAgIC5hcHBlbmQoJ3NwYW4nKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnbGVnZW5kLWl0ZW0tbGFiZWwnKVxuICAgICAgICAudGV4dChkKTtcbiAgICB9KTtcblxuICBjb25zdCBsZWdlbmRVcGRhdGluZyA9IGxlZ2VuZEVudGVyaW5nXG4gICAgLm1lcmdlKGxlZ2VuZEJpbmRpbmcpXG4gICAgLmNsYXNzZWQoJ2Nhbi1vdmVycmlkZScsICEhY29sb3JTY2FsZS5yYW5nZSlcbiAgICAuY2xhc3NlZCgnbm8tb3ZlcnJpZGUnLCAhY29sb3JTY2FsZS5yYW5nZSk7XG5cbiAgbGVnZW5kVXBkYXRpbmdcbiAgICAuc2VsZWN0KCdpbnB1dCcpXG4gICAgLnByb3BlcnR5KCd2YWx1ZScsIGQgPT4gY29sb3JIZXhTdHJpbmcoY29sb3JTY2FsZShkKSkpO1xuICBsZWdlbmRVcGRhdGluZy5zZWxlY3QoJy5sZWdlbmQtaXRlbS1sYWJlbCcpLnRleHQoZCA9PiBkKTtcbiAgbGVnZW5kVXBkYXRpbmdcbiAgICAuc2VsZWN0KCcubGVnZW5kLXN3YXRjaCcpXG4gICAgLnN0eWxlKCdiYWNrZ3JvdW5kJywgZCA9PiBjb2xvckhleFN0cmluZyhjb2xvclNjYWxlKGQpKSk7XG5cbiAgY29uc3QgcmVzZXRDb2xvcnNCdG4gPSBsZWdlbmRDb250YWluZXIuc2VsZWN0KCcucmVzZXQtY29sb3JzLWJ0bicpLmVtcHR5KClcbiAgICA/IGxlZ2VuZENvbnRhaW5lclxuICAgICAgICAuYXBwZW5kKCdidXR0b24nKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAncmVzZXQtY29sb3JzLWJ0bicpXG4gICAgICAgIC5zdHlsZSgnZGlzcGxheScsICdub25lJylcbiAgICAgICAgLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICBjb2xvclJhbmdlT3ZlcnJpZGVzID0gW107XG4gICAgICAgICAgcmVuZGVyKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC50ZXh0KCdSZXNldCBDb2xvcnMnKVxuICAgIDogbGVnZW5kQ29udGFpbmVyLnNlbGVjdCgnLnJlc2V0LWNvbG9ycy1idG4nKTtcblxuICBpZiAoY29sb3JSYW5nZU92ZXJyaWRlcy5maWx0ZXIoZCA9PiBkICE9IG51bGwpLmxlbmd0aCkge1xuICAgIHJlc2V0Q29sb3JzQnRuLnN0eWxlKCdkaXNwbGF5JywgJycpO1xuICB9IGVsc2Uge1xuICAgIHJlc2V0Q29sb3JzQnRuLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgfVxuXG4gIHJlc2V0Q29sb3JzQnRuLnJhaXNlKCk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRyZWUoKSB7XG4gIGNvbnNvbGUubG9nKCdyZW5kZXIgc3ZnIHdpdGggcm9vdE5vZGUnLCByb290Tm9kZSk7XG4gIC8vIHJvb3RDb250YWluZXIuc2VsZWN0KCdzdmcnKS5yZW1vdmUoKTtcbiAgY29uc3Qgbm9kZXMgPSByb290Tm9kZSA/IHJvb3ROb2RlLmRlc2NlbmRhbnRzKCkgOiBbXTtcbiAgY29uc3QgbGlua3MgPSByb290Tm9kZSA/IHJvb3ROb2RlLmxpbmtzKCkgOiBbXTtcbiAgY29uc29sZS5sb2coJ3JlbmRlciBzdmcgd2l0aCBub2RlcycsIG5vZGVzKTtcbiAgY29uc29sZS5sb2coJ3JlbmRlciBzdmcgd2l0aCBsaW5rcycsIGxpbmtzKTtcblxuICAvLyBpbml0aWFsaXplIG1haW4gU1ZHXG4gIGNvbnN0IHN2ZyA9IHJvb3RDb250YWluZXIuc2VsZWN0KCdzdmcnKS5lbXB0eSgpXG4gICAgPyByb290Q29udGFpbmVyLnNlbGVjdCgnLnZpcy1jb250YWluZXInKS5hcHBlbmQoJ3N2ZycpXG4gICAgOiByb290Q29udGFpbmVyLnNlbGVjdCgnc3ZnJyk7XG5cbiAgc3ZnLmF0dHIoJ3dpZHRoJywgd2lkdGgpLmF0dHIoJ2hlaWdodCcsIGhlaWdodCk7XG5cbiAgLy8gdGhlIG1haW4gPGc+IHdoZXJlIGFsbCB0aGUgY2hhcnQgY29udGVudCBnb2VzIGluc2lkZVxuICBjb25zdCBnID0gc3ZnLnNlbGVjdCgnLnJvb3QtZycpLmVtcHR5KClcbiAgICA/IHN2Z1xuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3Jvb3QtZycpXG4gICAgICAgIC5hdHRyKFxuICAgICAgICAgICd0cmFuc2Zvcm0nLFxuICAgICAgICAgICd0cmFuc2xhdGUoJyArIHBhZGRpbmcubGVmdCArICcgJyArIHBhZGRpbmcudG9wICsgJyknXG4gICAgICAgIClcbiAgICA6IHN2Zy5zZWxlY3QoJy5yb290LWcnKTtcblxuICBjb25zdCBnTGlua3MgPSBnLnNlbGVjdCgnLmxpbmtzJykuZW1wdHkoKVxuICAgID8gZy5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdsaW5rcycpXG4gICAgOiBnLnNlbGVjdCgnLmxpbmtzJyk7XG4gIGNvbnN0IGdOb2RlcyA9IGcuc2VsZWN0KCcubm9kZXMnKS5lbXB0eSgpXG4gICAgPyBnLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ25vZGVzJylcbiAgICA6IGcuc2VsZWN0KCcubm9kZXMnKTtcblxuICAvLyBjb25zdCBoaWdobGlnaHRMYWJlbCA9IGcuc2VsZWN0KCcuaGlnaGxpZ2h0LWxhYmVsJykuZW1wdHkoKVxuICAvLyAgID8gZ1xuICAvLyAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgLy8gICAgICAgLmF0dHIoJ2NsYXNzJywgJ2hpZ2hsaWdodC1sYWJlbCcpXG4gIC8vICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAvLyAgICAgICAuYXR0cignZHknLCBwb2ludFJhZGl1cyArIDE4KVxuICAvLyAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgJzYwMCcpXG4gIC8vICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gIC8vICAgOiBnLnNlbGVjdCgnLmhpZ2hsaWdodC1sYWJlbCcpO1xuXG4gIC8vIHJlbmRlciBub2Rlc1xuICBjb25zdCBub2Rlc0JpbmRpbmcgPSBnTm9kZXMuc2VsZWN0QWxsKCcubm9kZScpLmRhdGEobm9kZXMsIGQgPT4gZFtpZEtleV0pO1xuICBub2Rlc0JpbmRpbmcuZXhpdCgpLnJlbW92ZSgpO1xuICBjb25zdCBub2Rlc0VudGVyID0gbm9kZXNCaW5kaW5nXG4gICAgLmVudGVyKClcbiAgICAuYXBwZW5kKCdjaXJjbGUnKVxuICAgIC5hdHRyKCdjbGFzcycsICdub2RlJylcbiAgICAuYXR0cigncicsIHBvaW50UmFkaXVzKVxuICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBkID0+IGB0cmFuc2xhdGUoJHtkLnh9ICR7ZC55fSlgKVxuICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIC8vIGhpZ2hsaWdodExhYmVsXG4gICAgICAvLyAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlKCR7ZC54fSAke2QueX0pYClcbiAgICAgIC8vICAgLnRleHQoSlNPTi5zdHJpbmdpZnkoZC5kYXRhKSk7XG4gICAgICBoaWdobGlnaHROb2RlID0gZDtcbiAgICAgIHJlbmRlckhpZ2hsaWdodCgpO1xuICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgdHJ1ZSk7XG4gICAgfSlcbiAgICAub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGhpZ2hsaWdodExhYmVsLnRleHQoJycpO1xuICAgICAgaGlnaGxpZ2h0Tm9kZSA9IG51bGw7XG4gICAgICByZW5kZXJIaWdobGlnaHQoKTtcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdoaWdobGlnaHRlZCcsIGZhbHNlKTtcbiAgICB9KTtcblxuICBub2Rlc0VudGVyXG4gICAgLm1lcmdlKG5vZGVzQmluZGluZylcbiAgICAuY2xhc3NlZCgnc3BlY2lhbCcsIGQgPT4gaXNTcGVjaWFsKGQuZGF0YSkpXG4gICAgLmF0dHIoXG4gICAgICAncicsXG4gICAgICBkID0+IChpc1NwZWNpYWwoZC5kYXRhKSA/IHNwZWNpYWxTaXplRmFjdG9yICogcG9pbnRSYWRpdXMgOiBwb2ludFJhZGl1cylcbiAgICApXG4gICAgLmF0dHIoJ3RyYW5zZm9ybScsIGQgPT4gYHRyYW5zbGF0ZSgke2QueH0gJHtkLnl9KWApXG4gICAgLnN0eWxlKCdmaWxsJywgZCA9PiBjb2xvclNjYWxlKGQuZGF0YVtjb2xvcktleV0pKTtcblxuICAvLyByZW5kZXIgbGlua3NcbiAgY29uc3QgbGlua3NCaW5kaW5nID0gZ0xpbmtzXG4gICAgLnNlbGVjdEFsbCgnLmxpbmsnKVxuICAgIC5kYXRhKGxpbmtzLCBkID0+IGAke2Quc291cmNlW2lkS2V5XX0tLSR7ZC50YXJnZXRbaWRLZXldfWApO1xuICBsaW5rc0JpbmRpbmcuZXhpdCgpLnJlbW92ZSgpO1xuXG4gIGNvbnN0IGxpbmtzRW50ZXIgPSBsaW5rc0JpbmRpbmdcbiAgICAuZW50ZXIoKVxuICAgIC5hcHBlbmQoJ2xpbmUnKVxuICAgIC5hdHRyKCdjbGFzcycsICdsaW5rJylcbiAgICAuYXR0cigneDEnLCBkID0+IGQuc291cmNlLngpXG4gICAgLmF0dHIoJ3kxJywgZCA9PiBkLnNvdXJjZS55KVxuICAgIC5hdHRyKCd4MicsIGQgPT4gZC50YXJnZXQueClcbiAgICAuYXR0cigneTInLCBkID0+IGQudGFyZ2V0LnkpO1xuXG4gIGxpbmtzRW50ZXJcbiAgICAubWVyZ2UobGlua3NCaW5kaW5nKVxuICAgIC5hdHRyKCd4MScsIGQgPT4gZC5zb3VyY2UueClcbiAgICAuYXR0cigneTEnLCBkID0+IGQuc291cmNlLnkpXG4gICAgLmF0dHIoJ3gyJywgZCA9PiBkLnRhcmdldC54KVxuICAgIC5hdHRyKCd5MicsIGQgPT4gZC50YXJnZXQueSlcbiAgICAuc3R5bGUoJ3N0cm9rZScsIGQgPT4gY29sb3JTY2FsZShkLnRhcmdldC5kYXRhW2NvbG9yS2V5XSkpO1xufVxuXG5mdW5jdGlvbiB0cmVlRnJvbUNzdlRleHRBcmVhKCkge1xuICBjb25zdCB0ZXh0ID0gZDMuc2VsZWN0KCcjY3N2LXRleHQtaW5wdXQnKS5wcm9wZXJ0eSgndmFsdWUnKTtcbiAgY3N2RGF0YSA9IGQzLmNzdlBhcnNlKHRleHQpO1xuXG4gIC8vIGNob29zZSBzZXF1ZW50aWFsIHZhbHVlcyBpZiBrZXkgaXMgbm90IGZvdW5kIGluIHRoZSBjc3ZcbiAgbGV0IGxhc3RVc2VkQ29sdW1uID0gMDtcbiAgY29uc3QgeyBjb2x1bW5zIH0gPSBjc3ZEYXRhO1xuICBpZiAoIWNvbHVtbnMuaW5jbHVkZXMoaWRLZXkpKSB7XG4gICAgaWRLZXkgPSBjb2x1bW5zW2xhc3RVc2VkQ29sdW1uXTtcbiAgICBsYXN0VXNlZENvbHVtbiArPSAxO1xuICB9XG4gIGlmICghY29sdW1ucy5pbmNsdWRlcyhwYXJlbnRLZXkpKSB7XG4gICAgcGFyZW50S2V5ID0gY29sdW1uc1tsYXN0VXNlZENvbHVtbl07XG4gICAgbGFzdFVzZWRDb2x1bW4gKz0gMTtcbiAgfVxuICBpZiAoIWNvbHVtbnMuaW5jbHVkZXMoY29sb3JLZXkpICYmIGNvbG9yS2V5ICE9PSAnbm9uZScpIHtcbiAgICBjb2xvcktleSA9IGNvbHVtbnNbbGFzdFVzZWRDb2x1bW5dO1xuICAgIGxhc3RVc2VkQ29sdW1uICs9IDE7XG4gIH1cbiAgaWYgKCFjb2x1bW5zLmluY2x1ZGVzKHNwZWNpYWxLZXkpICYmIHNwZWNpYWxLZXkgIT09ICdub25lJykge1xuICAgIHNwZWNpYWxLZXkgPSBjb2x1bW5zW2xhc3RVc2VkQ29sdW1uXTtcbiAgICBsYXN0VXNlZENvbHVtbiArPSAxO1xuICB9XG5cbiAgLy8gdHJ5IHRvIGNvbnN0cnVjdCB0aGUgdHJlZVxuICB0cnkge1xuICAgIGNvbnN0IHN0cmF0aWZpZXIgPSBkM1xuICAgICAgLnN0cmF0aWZ5KClcbiAgICAgIC5pZChkID0+IGRbaWRLZXldKVxuICAgICAgLnBhcmVudElkKGQgPT4gZFtwYXJlbnRLZXldKTtcbiAgICByb290Tm9kZSA9IHN0cmF0aWZpZXIoY3N2RGF0YSk7XG4gICAgZDMuc2VsZWN0KCcjZXJyb3ItbWVzc2FnZScpLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgY29uc3QgZXJyb3JNaXNzaW5nTWF0Y2ggPSBlLm1lc3NhZ2UubWF0Y2goL15taXNzaW5nOiAoLiopLyk7XG4gICAgbGV0IGVycm9yTWVzc2FnZSA9IGUubWVzc2FnZTtcbiAgICBpZiAoZXJyb3JNaXNzaW5nTWF0Y2gpIHtcbiAgICAgIGVycm9yTWVzc2FnZSA9IGBDb3VsZCBub3QgZmluZCBwYXJlbnQgbm9kZSB3aXRoIElEIFwiJHtlcnJvck1pc3NpbmdNYXRjaFsxXX1cIi4gRGlkIHlvdSBzZWxlY3QgdGhlIHJpZ2h0IFBhcmVudCBjb2x1bW4/IEl0IGlzIGN1cnJlbnRseSBzZXQgdG8gJHtwYXJlbnRLZXl9LmA7XG4gICAgfSBlbHNlIGlmIChlLm1lc3NhZ2UgPT09ICdubyByb290Jykge1xuICAgICAgZXJyb3JNZXNzYWdlID0gYENvdWxkIG5vdCBmaW5kIGEgbm9kZSB3aXRoIG5vIHBhcmVudC4gVGhlIHBhcmVudCBJRCBjb2x1bW4gKGN1cnJlbnRseSAke3BhcmVudEtleX0pIHNob3VsZCBiZSBlbXB0eSBmb3IgdGhlIHJvb3Qgbm9kZSBvZiB0aGUgdHJlZS5gO1xuICAgIH0gZWxzZSBpZiAoZS5tZXNzYWdlID09PSAnbXVsdGlwbGUgcm9vdHMnKSB7XG4gICAgICBlcnJvck1lc3NhZ2UgPSBgTXVsdGlwbGUgbm9kZXMgaGFkIG5vIHBhcmVudCBzZXQuIFRoZXJlIGNhbiBvbmx5IGJlIG9uZSByb290IG5vZGUuIEVuc3VyZSBlYWNoIG5vZGUgaGFzIGEgcGFyZW50IElEIGJlc2lkZXMgdGhlIHJvb3QuIFRoZSBjdXJyZW50IHBhcmVudCBjb2x1bW4gaXMgJHtwYXJlbnRLZXl9LmA7XG4gICAgfSBlbHNlIGlmIChlLm1lc3NhZ2UgPT09ICdjeWNsZScpIHtcbiAgICAgIGVycm9yTWVzc2FnZSA9IGBEZXRlY3RlZCBhIGN5Y2xlIGluIHRoZSB0cmVlLiBJbnNwZWN0IHBhcmVudCBJRHMgdG8gZW5zdXJlIG5vIGN5Y2xlcyBleGlzdCBpbiB0aGUgZGF0YS4gVGhlIGN1cnJlbnQgcGFyZW50IElEIGNvbHVtbiBpcyAke3BhcmVudEtleX0uYDtcbiAgICB9XG4gICAgZDNcbiAgICAgIC5zZWxlY3QoJyNlcnJvci1tZXNzYWdlJylcbiAgICAgIC5zdHlsZSgnZGlzcGxheScsICcnKVxuICAgICAgLnNlbGVjdCgnLmVycm9yLWRldGFpbHMnKVxuICAgICAgLnRleHQoZXJyb3JNZXNzYWdlKTtcbiAgfVxuXG4gIC8vIHJ1biB0cmVlIGxheW91dFxuICBjb25zdCB0cmVlID0gZDMudHJlZSgpLnNpemUoW3Bsb3RBcmVhV2lkdGgsIHBsb3RBcmVhSGVpZ2h0XSk7XG4gIHRyZWUocm9vdE5vZGUpO1xuXG4gIGNvbnNvbGUubG9nKCdnb3QgY3N2RGF0YSA9JywgY3N2RGF0YSk7XG4gIGNvbnNvbGUubG9nKCdnb3Qgcm9vdE5vZGUgPScsIHJvb3ROb2RlKTtcbiAgY29uc29sZS5sb2coaWRLZXkpO1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZVNlbGVjdChpZCwgaW5pdGlhbFZhbHVlLCB1cGRhdGVGbiwgaW5jbHVkZU5vbmUpIHtcbiAgICAvLyB1cGRhdGUgdGhlIGNvbHVtbiBzZWxlY3RzXG4gICAgY29uc3Qgc2VsZWN0ID0gZDMuc2VsZWN0KGAjJHtpZH1gKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICB1cGRhdGVGbih0aGlzLnZhbHVlKTtcbiAgICAgIHRyZWVGcm9tQ3N2VGV4dEFyZWEoKTtcbiAgICAgIHJlbmRlcigpO1xuICAgIH0pO1xuXG4gICAgY29uc3Qgb3B0aW9uQmluZGluZyA9IHNlbGVjdC5zZWxlY3RBbGwoJ29wdGlvbicpLmRhdGEoY3N2RGF0YS5jb2x1bW5zKTtcblxuICAgIG9wdGlvbkJpbmRpbmcuZXhpdCgpLnJlbW92ZSgpO1xuICAgIG9wdGlvbkJpbmRpbmdcbiAgICAgIC5lbnRlcigpXG4gICAgICAuYXBwZW5kKCdvcHRpb24nKVxuICAgICAgLm1lcmdlKG9wdGlvbkJpbmRpbmcpXG4gICAgICAucHJvcGVydHkoJ3ZhbHVlJywgZCA9PiBkKVxuICAgICAgLnRleHQoZCA9PiBkKTtcblxuICAgIGlmIChpbmNsdWRlTm9uZSkge1xuICAgICAgc2VsZWN0XG4gICAgICAgIC5hcHBlbmQoJ29wdGlvbicpXG4gICAgICAgIC50ZXh0KCdub25lJylcbiAgICAgICAgLnByb3BlcnR5KCd2YWx1ZScsICdub25lJylcbiAgICAgICAgLmxvd2VyKCk7XG4gICAgfVxuXG4gICAgc2VsZWN0LnByb3BlcnR5KCd2YWx1ZScsIGluaXRpYWxWYWx1ZSk7XG4gIH1cbiAgdXBkYXRlU2VsZWN0KCdpZC1rZXktc2VsZWN0JywgaWRLZXksIHZhbHVlID0+IChpZEtleSA9IHZhbHVlKSk7XG4gIHVwZGF0ZVNlbGVjdCgncGFyZW50LWtleS1zZWxlY3QnLCBwYXJlbnRLZXksIHZhbHVlID0+IChwYXJlbnRLZXkgPSB2YWx1ZSkpO1xuICB1cGRhdGVTZWxlY3QoJ2NvbG9yLWtleS1zZWxlY3QnLCBjb2xvcktleSwgdmFsdWUgPT4gKGNvbG9yS2V5ID0gdmFsdWUpLCB0cnVlKTtcbiAgdXBkYXRlU2VsZWN0KFxuICAgICdzcGVjaWFsLWtleS1zZWxlY3QnLFxuICAgIHNwZWNpYWxLZXksXG4gICAgdmFsdWUgPT4gKHNwZWNpYWxLZXkgPSB2YWx1ZSksXG4gICAgdHJ1ZVxuICApO1xuXG4gIGQzLnNlbGVjdCgnI3dpZHRoLWlucHV0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHVwZGF0ZURpbWVuc2lvbnMoK3RoaXMudmFsdWUsIGhlaWdodCk7XG4gICAgdHJlZUZyb21Dc3ZUZXh0QXJlYSgpO1xuICAgIHJlbmRlcigpO1xuICB9KTtcbiAgZDMuc2VsZWN0KCcjaGVpZ2h0LWlucHV0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHVwZGF0ZURpbWVuc2lvbnMod2lkdGgsICt0aGlzLnZhbHVlKTtcbiAgICB0cmVlRnJvbUNzdlRleHRBcmVhKCk7XG4gICAgcmVuZGVyKCk7XG4gIH0pO1xufVxuXG50cmVlRnJvbUNzdlRleHRBcmVhKCk7XG5yZW5kZXIoKTtcbiJdLCJuYW1lcyI6WyJsZXQiLCJjb25zdCIsInRoaXMiXSwibWFwcGluZ3MiOiJBQUFBQSxHQUFHLENBQUMsT0FBTyxDQUFDO0FBQ1pBLEdBQUcsQ0FBQyxRQUFRLENBQUM7QUFDYkEsR0FBRyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7QUFDckJBLEdBQUcsQ0FBQyxTQUFTLEdBQUcsUUFB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