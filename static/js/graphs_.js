queue()
    .defer(d3.json, "/election/votes")
    .defer(d3.json, "static/geojson/us-states.json")
    .await(makeGraphs);

function makeGraphs(error, votesJson, statesJson) {
	// projectsJson
	//Clean projectsJson data
	var electionVotes = votesJson;
	// var dateFormat = d3.time.format("%Y-%m-%d");
	electionVotes.forEach(function(d) {
		//d["date_posted"] = dateFormat.parse(d["date_posted"]);
		//d["date_posted"].setDate(1);
		d["nb_votes"] = +d["nb_votes"];
	});

	//Create a Crossfilter instance
	var ndx = crossfilter(electionVotes);

	//Define Dimensions
	//var dateDim = ndx.dimension(function(d) { return d["date_posted"]; });
	//var resourceTypeDim = ndx.dimension(function(d) { return d["resource_type"]; });
	var voteDim = ndx.dimension(function(d) { return d["vote"]; });
	var stateDim = ndx.dimension(function(d) { return d["state"]; });
	var totalVotesDim  = ndx.dimension(function(d) { return d["nb_votes"]; });


	//Calculate metrics
	//var numProjectsByDate = dateDim.group(); 
	//var numProjectsByResourceType = resourceTypeDim.group();
	var numVotesByState = voteDim.group();
	//var numVotesByStateLevel = voteDim.group();
	var totalVotesByState = stateDim.group().reduceSum(function(d) {
		return d["nb_votes"];
	});

	//var all = ndx.groupAll();
	var totalVotes = ndx.groupAll().reduceSum(function(d) {return d["nb_votes"];});

	var max_state = totalVotesByState.top(1)[0].value;

	//Define values (to be used in charts)
	//var minDate = dateDim.bottom(1)[0]["date_posted"];
	//var maxDate = dateDim.top(1)[0]["date_posted"];

    //Charts
	//var timeChart = dc.barChart("#time-chart");
	//var resourceTypeChart = dc.rowChart("#resource-type-row-chart");
	var voteLevelChart = dc.rowChart("#vote-level-row-chart");
	var usChart = dc.geoChoroplethChart("#us-chart");
	//var numberProjectsND = dc.numberDisplay("#number-projects-nd");
	var totalVotesND = dc.numberDisplay("#total-votes-nd");

	//numberProjectsND
	//	.formatNumber(d3.format("d"))
	//	.valueAccessor(function(d){return d; })
	//	.group(all);

	totalVotesND
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(totalVotes)
		.formatNumber(d3.format(".3s"));

	//timeChart
	//	.width(600)
	//	.height(160)
	//	.margins({top: 10, right: 50, bottom: 30, left: 50})
	//	.dimension(dateDim)
	//	.group(numProjectsByDate)
	//	.transitionDuration(500)
	//	.x(d3.time.scale().domain([minDate, maxDate]))
	//	.elasticY(true)
	//	.xAxisLabel("Year")
	//	.yAxis().ticks(4);

	//resourceTypeChart
    //    .width(300)
    //    .height(250)
    //    .dimension(resourceTypeDim)
    //    .group(numProjectsByResourceType)
    //    .xAxis().ticks(4);

	voteLevelChart
		.width(300)
		.height(250)
        .dimension(voteDim)
        .group(numVotesByState)
        .xAxis().ticks(4);


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
					+ "Total Votes: " + Math.round(p["value"]) + " $";
		})

    dc.renderAll();

};