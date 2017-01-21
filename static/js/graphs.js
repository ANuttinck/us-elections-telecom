setInterval(function(){ queue()
    .defer(d3.json, "/election/votes")
    .defer(d3.json, "static/geojson/us-states.json")
    .await(makeGraphs/*dc.redrawAll()*/) }, 60000);

queue()
    .defer(d3.json, "/election/votes")
    .defer(d3.json, "static/geojson/us-states.json")
    .await(makeGraphs);

function reduceInitial() {
    return {
        nb_votes : 0,
        vote : ""
    };
};

function reduceAdd(p, v) {
    if(parseInt(p["nb_votes"]) < parseInt(v["nb_votes"])){
        p["nb_votes"] = v["nb_votes"]
        p["vote"] = v["vote"]
    }
    return p;
 };


function reduceRemove(p, v) {
   return p;
};


function reduceInitialCandidate() {
    return vote="", nb_votes=0;
};

function reduceAddCandidate(vote, nb_votes, vote2, nb_votes2) {
    if(parseInt(nb_votes) < parseInt(nb_votes2)){
        nb_votes = nb_votes2
        vote = vote2
    }
    return vote,nb_votes;
 };

 function reduceRemoveCandidate(vote, nb_votes, vote2, nb_votes2) {
    return vote, nb_votes;
 };



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
  var candidateDim = ndx.dimension(function(d) { return d["vote"]; });

	//Calculate metrics

	//var numVotesByState = voteDim.group();
  var totalVotesByState = stateDim.group().reduceSum(function(d) {
          return d["nb_votes"];
  });
  console.log(totalVotesByState.top(15));

  //console.log(totalVotesByState.keyAccessor());
  // Number of votes and name of the winner in a state
  var candidateAndVotesByState = stateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial)
  //console.log(candidateAndVotesByState.top(15));




  // Compute an Array with state as key and winner as value
  var candidateByState = [];
  for (i = 0; i < candidateAndVotesByState.all().length; i++) {
    var tkl = candidateAndVotesByState.all()[i]["keyz"];
    var u = candidateAndVotesByState.all()[i]["value"]["vote"];
    candidateByState.push({
      key : candidateAndVotesByState.all()[i]["key"],
      value : candidateAndVotesByState.all()[i]["value"]["vote"]
    })
  };

  console.log(candidateByState)




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
  //console.log(numVoteByCandidate.top(4)[3]);
////// PIE CHART



    chartCandidateScore
        .width(468)
        .height(280)
        .slicesCap(4)
        //.innerRadius(100)
        .dimension(candidateDim)
        .group(numVoteByCandidate)
        .colors(d3.scale.ordinal().domain(["Trump", "Clinton", "Blanc", "Others", "Johnson"]).range(["#E2F2FF", "#6baed6", "#3182bd", "#e6550d", "#9ecae1"]))
        .colorDomain(["Trump", "Clinton", "Blanc", "Others"])
        .colorAccessor(function (d) {
            return d.data.key
        })
        .colorCalculator(function (d) {
            return d ? chartCandidateScore.colors()(d) : '#ccc';
        })
        .legend(dc.legend());




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
var colorScale = d3.scale.ordinal()
         .domain(["Blanc", "Clinton", "Johnson", "Trump", "Autre", "Stein", "McMullin", "Castle"])
         .range(["#ffffff", "#0000ff", "#07a1e8", "#c00000", "#ffffff", "#70ad47", "#878485", "9bc002"]);

    var colorScale = d3.scale.ordinal().domain(["Trump", "Clinton"])
        .range(["#E2F2FF", "#0061B5"]);


    usChart.width(1000)
        .height(330)
        .dimension(stateDim)
        .group(candidateByState)
        .colors(d3.scale.ordinal().range(["#ffffff", "#0000ff", "#07a1e8", "#c00000", "#ffffff", "#70ad47", "#878485", "9bc002"]))
        .colorDomain(["Blanc", "Clinton", "Johnson", "Trump", "Autre", "Stein", "McMullin", "Castle"])
        .colorAccessor(function (d) {
            return d
        })
        .colorCalculator(function (d) {
            return d ? usChart.colors()(d) : '#ccc';
        })
        .overlayGeoJson(statesJson["features"], "state", function (d) {
            return d.properties.name;
        })
        .projection(d3.geo.albersUsa()
            .scale(600)
            .translate([340, 150]))
        .title(function (p) {
            return "State: " + p["key"]
                + "\n"
                + "Winner: " + p["value"]
        });

    dc.renderAll();

};
