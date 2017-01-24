setInterval(function () {
    queue()
        .defer(d3.json, "/election/votes")
        .defer(d3.json, "static/geojson/us-states.json")
        .defer(d3.json, "static/geojson/largeElectors.json")
        .await(makeGraphs/*dc.redrawAll()*/)
}, 60000);

queue()
    .defer(d3.json, "/election/votes")
    .defer(d3.json, "static/geojson/us-states.json")
    .defer(d3.json, "static/geojson/largeElectors.json")
    .await(makeGraphs);

function reduceInitial() {
    return {
        nb_votes: 0,
        vote: ""
    };
};


function reduceAdd(p, v) {
    if (parseInt(p["nb_votes"]) < parseInt(v["nb_votes"])) {
        p["nb_votes"] = v["nb_votes"]
        p["vote"] = v["vote"]
    }
    return p;
};


function reduceRemove(p, v) {
    return p;
};


function makeGraphs(error, votesJson, statesJson, largeElectors) {

    // get the largeElectors
    var largeElectorsByState = largeElectors["features"];
    //largeElectorsByState.forEach(function(d) {
    //  d["value"] = +d["value"];
    //})

    //Clean projectsJson data
    var electionVotes = votesJson;
    //electionVotes.forEach(function (d) {
    //    d["nb_votes_total"] = +d["nb_votes_total"];
    //});



    for (i = 0; i < electionVotes.length; i++) {
      for (j = 0; j < largeElectorsByState.length; j++) {
        if(electionVotes[i]["state"] == largeElectorsByState[j]["key"]){
          if(electionVotes[i]["vote"] == largeElectorsByState[j]["vote"]){
            electionVotes[i]["largeElectorsWon"] = largeElectorsByState[j]["value"];
          }
          else if(electionVotes[i]["vote"] != "Clinton" && electionVotes[i]["vote"] != "Trump"){
            electionVotes[i]["largeElectorsWon"] = 0;
          }
        }
      }
    };
    console.log(electionVotes);
    console.log(largeElectorsByState);



    //Create a Crossfilter instance
    var ndx = crossfilter(electionVotes);

    //Define Dimensions
    //var voteDim = ndx.dimension(function(d) { return d["nb_votes"]; });
    var stateDim = ndx.dimension(function (d) {
        return d["state"];
    });
    var totalVotesDim = ndx.dimension(function (d) {
        return d["nb_votes_total"];
    });
    var candidateDim = ndx.dimension(function (d) {
        return d["vote"];
    });

    //Calculate metrics

    //var numVotesByState = voteDim.group();
    var totalVotesByState = stateDim.group().reduceSum(function (d) {
        return d["nb_votes"];
    });
    //console.log(totalVotesByState.top(15));




    // Number of votes and name of the winner in a state
    var candidateAndVotesByState = stateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial)





    // Compute an Array with state as key and winner as value
    var candidateByState = [];
    for (i = 0; i < candidateAndVotesByState.all().length; i++) {
        candidateByState.push({
            key: candidateAndVotesByState.all()[i]["key"],
            value: candidateAndVotesByState.all()[i]["value"]["vote"]
        })
    }
    ;


    //console.log(candidateByState)


    // INDICATORS
    var all = ndx.groupAll();
    var totalVotes = ndx.groupAll().reduceSum(function (d) {
        return d["nb_votes"];
    });

    var all = ndx.groupAll();
    console.log(all.value());
    var totalLargeElectors = ndx.groupAll().reduceSum(function (d) {
        return d["largeElectorsWon"];
    });
    console.log(totalLargeElectors.value());
    //var max_state = totalVotesByState.top(1)[0].value;

    //var candidate = totalVotesByState["vote"];

    //Charts
    //var voteLevelChart = dc.rowChart("#vote-level-row-chart");
    var usChart = dc.geoChoroplethChart("#us-chart");
    var totalVotesND = dc.numberDisplay("#total-votes-nd");
    var numberLargeElectors = dc.numberDisplay("#number-large-electors");
    var chartCandidateScore = dc.pieChart("#candidate-score");


////// PIE CHART
    var candidateDim = ndx.dimension(function (d) {
        return d["vote"];
    });
    var numVoteByCandidate = candidateDim.group().reduceSum(function (d) {
        return d["nb_votes"];
    });

    var numElectorsByCandidate = candidateDim.group().reduceSum(function (d) {
        return d["largeElectorsWon"];
    });
////// PIE CHART


    chartCandidateScore
        .width(568)
        .height(380)
        .slicesCap(4)
        //.innerRadius(100)
        .dimension(candidateDim)
        //.group(numVoteByCandidate)
        .group(numElectorsByCandidate)
        .colors(d3.scale.ordinal()
            .domain(["Trump", "Clinton", "Johnson", "Blanc", "Others", "Stein", "McMullin", "Castle"])
            .range(["#d60405", "#026b9c", "#07a1e8", "#eeeeee", "#cccccc", "#70ad47", "#878485", "9bc002"]))
        .colorAccessor(function (d) {
            return d.data.key
        })
        .colorCalculator(function (d) {
            return d ? chartCandidateScore.colors()(d) : '#ccc';
        })
        .legend(dc.legend());
        //.legend();


    totalVotesND
        .formatNumber(d3.format("d"))
        .valueAccessor(function (d) {
            return d;
        })
        .group(totalVotes)
        .formatNumber(d3.format(".3s"));

    numberLargeElectors
        .formatNumber(d3.format("d"))
        .valueAccessor(function (d) {
            return d;
        })
        //.group(all);
        .group(totalLargeElectors)
        .formatNumber(d3.format(".3s"));

    //voteLevelChart
    //.width(300)
    //.height(250)
    //  .dimension(voteDim)
    //  .group(numVotesByState)
    //  .xAxis().ticks(4);


    usChart
        .width(1000)
        .height(380)
        .dimension(stateDim)
        .group(candidateByState)
        .colors(d3.scale.ordinal().range(["#d60405", "#026b9c", "#07a1e8", "#eeeeee", "#cccccc", "#70ad47", "#878485", "9bc002"]))
        .colorDomain(d3.scale.ordinal().range(["Trump", "Clinton", "Johnson", "Blanc", "Others", "Stein", "McMullin", "Castle"]))
        .colorAccessor(function (d) {
            return d
        })
        .overlayGeoJson(statesJson["features"], "state", function (d) {
            return d.properties.name;
        })
        .projection(d3.geo.albersUsa()
            .scale(750)
            .translate([380, 180]))
        .title(function (p) {
            return "State: " + p["key"]
                + "\n"
                + "Winner: " + p["value"]
        });

    dc.renderAll();

};
