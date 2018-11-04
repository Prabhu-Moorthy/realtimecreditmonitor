var chart = function (chartData) {
  AmCharts.makeChart("chartdiv", {
  "type": "serial",
  "theme": "dark",
  "dataDateFormat": "YYYY-MM",
  "precision": 2,
  "valueAxes": [{
    "id": "v1",
    "title": "Internal Rating / CNA Score", //change
    "position": "left",
    "autoGridCount": false,
    "labelFunction": function(value) {
      return  Math.round(value);
    }
  }, {
    "id": "v2",
    "title": "CNA Score", //change
    "gridAlpha": 0,
    "position": "right",
    "autoGridCount": false
  }],
  "graphs": [{
    "id": "g4",
    "valueAxis": "v1",
    "lineColor": "#62cf73",
    "fillColors": "#62cf73",
    "fillAlphas": 1,
    "type": "column",
    "title": "Internal Rating",//change
    "valueField": "creditscore",////u can replace market1 with ur data data2
    "clustered": false,
    "columnWidth": 5,
    "legendValueText": "[[value]]",
    "balloonText": "[[title]]<br /><b style='font-size: 130%'>[[value]]</b>"
  }, {
    "id": "g1",
    "valueAxis": "v1",
    "bullet": "round",
    "bulletBorderAlpha": 1,
    "bulletColor": "#FFFFFF",
    "bulletSize": 5,
    "hideBulletsCount": 50,
    "lineThickness": 2,
    "lineColor": "#20acd4",
    "type": "smoothedLine",
    "title": "CNA Score", //change
    "useLineColorForBulletBorder": true,
    "valueField": "sentimentscore", //u can replace market1 with ur data data1
    "balloonText": "[[title]]<br /><b style='font-size: 130%'>[[value]]</b>"
  }],
  "chartCursor": {
    "pan": true,
    "valueLineEnabled": true,
    "valueLineBalloonEnabled": true,
    "cursorAlpha": 0,
    "valueLineAlpha": 0.2
  },
  "categoryField": "date",
  "categoryAxis": {
    "parseDates": true,
    "dashLength": 1,
    "minorGridEnabled": true
  },
  "legend": {
    "useGraphSettings": true,
    "position": "top"
  },
  "balloon": {
    "borderThickness": 1,
    "shadowAlpha": 0
  },
  "export": {
   "enabled": true
  },
  "dataProvider": chartData
});
	}
	
	//gauge chart code starts
	
	var chart2 = function(pos,neg,neu) {
	AmCharts.makeChart("chartdiv2", {
    "type": "pie",
    "theme": "dark",
    "innerRadius": "40%",
    "gradientRatio": [-0.4, -0.4, -0.4, -0.4, -0.4, -0.4, 0, 0.1, 0.2, 0.1, 0, -0.2, -0.5],
    "dataProvider": [{
        "country": "Positive",
        "litres": pos
    }, {
        "country": "Negative",
        "litres": neg
    }, {
        "country": "Neutral",
        "litres": neu
    }],
    "balloonText": "[[value]]",
    "valueField": "litres",
    "titleField": "country",
    "balloon": {
        "drop": true,
        "adjustBorderColor": false,
        "color": "#FFFFFF",
        "fontSize": 16
    },
    "export": {
        "enabled": true
    }
});
}