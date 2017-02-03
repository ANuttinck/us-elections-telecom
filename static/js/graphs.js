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


    //Clean projectsJson data
    var electionVotes = votesJson;

    // add time to database
    var parseDate = d3.time.format("%Y-%m-%d-%H-%M").parse;
    electionVotes.forEach(function (d) {
      d["time"] = parseDate(d["time"]);
      //d["nb_votes_total"] = +d["nb_votes_total"];
    });


    // Add Large Electors to the data
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


    //Create a Crossfilter instance
    var ndx = crossfilter(electionVotes);

    //Define Dimensions
    var stateDim = ndx.dimension(function (d) {
        return d["state"];
    });
    var totalVotesDim = ndx.dimension(function (d) {
        return d["nb_votes_total"];
    });
    var candidateDim = ndx.dimension(function (d) {
        return d["vote"];
    });
    var dateDim = ndx.dimension(function(d) {
        return d["time"];
    });


    //Calculate metrics

    var totalVotesByState = stateDim.group().reduceSum(function (d) {
        return d["nb_votes"];
    });


    // Number of votes and name of the winner in a state
    var candidateAndVotesByState = stateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial)
    // Compute an Array with state as key and winner as value
    var candidateByState = [];
    for (i = 0; i < candidateAndVotesByState.all().length; i++) {
        candidateByState.push({
            key: candidateAndVotesByState.all()[i]["key"],
            value: candidateAndVotesByState.all()[i]["value"]["vote"]
        })
    };

    // INDICATORS
    var all = ndx.groupAll();
    var totalVotes = ndx.groupAll().reduceSum(function (d) {
        return d["nb_votes"];
    });

    var all = ndx.groupAll();
    var totalLargeElectors = ndx.groupAll().reduceSum(function (d) {
        return d["largeElectorsWon"];
    });

    var curTimeDate = d3.time.format("%H:%M");
    var latestTimeDate = curTimeDate(d3.max(electionVotes, function(d){ return d.time;}));
    $("i").html(latestTimeDate);
    //var candidate = totalVotesByState["vote"];
    // console.log(latestTimeDate);

    //Charts
    //var voteLevelChart = dc.rowChart("#vote-level-row-chart");
    var usChart = dc.geoChoroplethChart("#us-chart");
    var totalVotesND = dc.numberDisplay("#total-votes-nd");
    var numberLargeElectors = dc.numberDisplay("#number-large-electors");
    var chartCandidateScore = dc.pieChart("#candidate-score");
    var chartVoteCandidate = dc.barChart("#candidate-votes");
    var timeResultsChart  = dc.lineChart("#chart-line-resultsperminute");



////// PIE CHART /////

    var numElectorsByCandidate = candidateDim.group().reduceSum(function (d) {
        return d["largeElectorsWon"];
    });
////// PIE CHART /////


////// BAR CHART /////
    var candidateDim = ndx.dimension(function (d) {
        return d["vote"];
    });

    var numVoteByCandidate = candidateDim.group().reduceSum(function (d) {
        return d["nb_votes"];
    });

////// BAR CHART /////




////// TIME CHART /////
// Number of votes per candidate among time
/*var TrumpVotesByMinute = dateDim.group().reduce(

  function(p, v) {

    if(v["vote"]=="Clinton"){
      p =+ v["nb_votes"];
    }
    return p;
  },

  function(p, v) {
    return p;
  },

function() {
  return 0
    ;
});


var ClintonVotesByMinute = dateDim.group().reduce(

    function(p, v) {
      if (v["vote"]=="Trump") {
        p =+ v["nb_votes"];
      }
      return p;
    },

    function(p, v) {

      return p;
    },

  function() {
    return 0
      ;
    });*/



// Compute an Array with state as key and winner as value
/*var TrumpByM = [];
var ClintonByM = [];
for (i = 0; i < ClintonVotesByMinute.all().length; i++) {
    ClintonByM.push({
        key: ClintonVotesByMinute.all()[i]["key"],
        value: ClintonVotesByMinute.all()[i]["value"]
    });
    TrumpByM.push({
        key: TrumpVotesByMinute.all()[i]["key"],
        value: TrumpVotesByMinute.all()[i]["value"]
    });
};*/


// Number of votes and name of the winner in a state
//var voteByMinute = dateDim.group().reduceSum(function(d) {return d.nb_votes;});
var testClinton = 0;
var testTrump = 0;
var voteByM_Clinton=dateDim.group().reduceSum(function(d) {
  if (d.vote==="Clinton") {
    return d.nb_votes;}
  else{
    return 0;}
  });
var voteByM_Trump=dateDim.group().reduceSum(function(d) {
  if (d.vote==="Trump") {
    return d.nb_votes;}
  else{
    return 0;}
  });
var minDate = new Date("2016-11-08T20:00");
var maxDate = new Date("2016-11-08T21:00");

/*var votesClintonCum = ClintonVotesByMinute;
for (i = 1; i < ClintonVotesByMinute.all().length; i++) {
    votesClintonCum.all()[i]["value"] = ClintonVotesByMinute.all()[i-1]["value"] + ClintonVotesByMinute.all()[i]["value"]
};
var votesTrumpCum = TrumpVotesByMinute;
for (i = 1; i < TrumpVotesByMinute.all().length; i++) {
    votesTrumpCum.all()[i]["value"] = TrumpVotesByMinute.all()[i-1]["value"] + TrumpVotesByMinute.all()[i]["value"]
};*/

////// TIME CHART /////

//console.log(votesClintonCum.all());
//console.log(votesTrumpCum.all());
//////// PLOTTING //////
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




    timeResultsChart
        .width(650)
        .height(380)
        .dimension(dateDim)
        //.group(voteByMinute,"Number of votes")
        .group(voteByM_Clinton , "Clinton")  // voteByM_Clinton
        .stack(voteByM_Trump , "Trump")  // voteByM_Trump
        .renderArea(true)
        .x(d3.time.scale().domain([minDate,maxDate]))
        .elasticX(true)
        .elasticY(true)
        .brushOn(false)
        .margins({top: 20, right: 40, bottom: 50, left: 70})
        .colors(["#026b9c", "#d60405"])
        .legend(dc.legend().x(150).y(10).itemHeight(13).gap(5));


    chartVoteCandidate
        .width(650)
        .height(380)
        .margins({top: 10, right: 10, bottom: 30, left: 100})
        .dimension(candidateDim)
        .group(numVoteByCandidate)
        .x(d3.scale.ordinal().domain(["Trump", "Clinton", "Johnson", "Blanc", "Autre", "Stein", "McMullin", "Castle"]))
        .colors(d3.scale.ordinal().domain(["Trump", "Clinton", "Johnson", "Blanc", "Autre", "Stein", "McMullin", "Castle"])
                                  .range(["#d60405", "#026b9c", "#07a1e8", "#eeeeee", "#cccccc", "#70ad47", "#878485", "9bc002"]))
        .xUnits(dc.units.ordinal)
        .colorAccessor(function (d) {
            return d.data.key
        })
        .colorCalculator(function (d) {
            return d ? chartVoteCandidate.colors()(d) : '#ccc';
        })
        .yAxisLabel("Number of votes")
        //.yAxis().tickFormat()
        .elasticY(true)
        .gap(10);


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
