queue()
    .defer(d3.json, "/election/votes")
    .defer(d3.json, "static/geojson/us-states.json")
    .await(makeGraphs);

function makeGraphs(error, votesJson, statesJson) {

	//Clean projectsJson data
	var electionVotes = votesJson;
	electionVotes.forEach(function(d) {
		//d["nb_votes"] = +d["nb_votes"];
		d["nb_votes_total"] = +d["nb_votes_total"];
	});

	//Create a Crossfilter instance
	var ndx = crossfilter(electionVotes);

	//Define Dimensions
	//var voteDim = ndx.dimension(function(d) { return d["nb_votes"]; });
	var stateDim = ndx.dimension(function(d) { return d["state"]; });
	var totalVotesDim  = ndx.dimension(function(d) { return d["nb_votes_total"]; });


	//Calculate metrics
	//var numVotesByState = voteDim.group();
	var totalVotesByState = stateDim.group().reduceSum(function(d) {
		return d["nb_votes"];
	});

	var all = ndx.groupAll();
  var totalVotes = ndx.groupAll().reduceSum(function(d) {return d["nb_votes"];});

	var max_state = totalVotesByState.top(1)[0].value;

  //var candidate = totalVotesByState["vote"];

    //Charts
	//var voteLevelChart = dc.rowChart("#vote-level-row-chart");
	var usChart = dc.geoChoroplethChart("#us-chart");
	var totalVotesND = dc.numberDisplay("#total-votes-nd");
  var numberObsND = dc.numberDisplay("#number-obs-nd");
  var chartCandidateScore = dc.pieChart("#candidate-score");


////// PIE CHART
  var candidateDim  = ndx.dimension(function(d) {return d["vote"];});
  var numVoteByCandidate = candidateDim.group().reduceSum(function(d) {return d["nb_votes"];});
  console.log(numVoteByCandidate.top(4)[3]);
////// PIE CHART









	totalVotesND
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
    .group(totalVotes)
		.formatNumber(d3.format(".3s"));

  numberObsND
  	.formatNumber(d3.format("d"))
  	.valueAccessor(function(d){return d; })
  	.group(all);

	//voteLevelChart
		//.width(300)
		//.height(250)
      //  .dimension(voteDim)
      //  .group(numVotesByState)
      //  .xAxis().ticks(4);

  chartCandidateScore
    .width(468)
    .height(280)
    .slicesCap(4)
    //.innerRadius(100)
    .dimension(candidateDim)
    .group(numVoteByCandidate)
    .legend(dc.legend())
    // workaround for #703: not enough data is accessible through .label() to display percentages
    //.on('pretransition', function(chart) {
    //    chart.selectAll('text.pie-slice').text(function(d) {
    //        return d.data.key + ' ' + dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2*Math.PI) * 100) + '%'})});

	usChart.width(1000)
		.height(330)
		.dimension(stateDim)
		.group(totalVotesByState)
		.colors(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
		.colorDomain([0, max_state])
		.overlayGeoJson(statesJson["features"], "state", function (d) {
			return d.properties.name;
		})
		.projection(d3.geo.albersUsa()
    				.scale(600)
    				.translate([340, 150]))
		.title(function (p) {
			return "State: " + p["key"]
					+ "\n"
					+ "Total Votes: " + Math.round(p["value"]) + " votes";
		})

    dc.renderAll();

};
