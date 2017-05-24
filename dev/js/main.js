require([
	'Gesture', 
	'GesturePool', 
	'mustache',
	'watch', 
	'leap', 
	'leap-plugins', 
	'leap-hand'
], function(Gesture, GesturePool, Mustache, WatchJS, Leap) {

  var controller      = new Leap.Controller(),
  gp              = new GesturePool(),
  recording       = false,
  recordedGesture = [],
  dataBuffer      = [],
  results         = [[],[]];

  controller.use('riggedHand', {

    materialOptions: { 
      wireframe: false,
      opacity: 1.0 
    }

  });

  document.getElementById('reset-log').addEventListener('click', function(evt) {

  	evt.preventDefault();
  	evt.stopPropagation();

  	document.getElementById('gesture-log').querySelector('p').innerHTML = '';

  });
  
  document.getElementById('addGesture').addEventListener('click', function(evt) {

    evt.preventDefault();
    evt.stopPropagation();

    var gest = new Gesture(gp),
    row  = document.createElement('tr');

    gest.element = row;
    gest.name = 'Gesture #' + gp.gestures.length;

    row.innerHTML = Mustache.render(document.getElementById('__template_gesture').innerHTML, { name: gest.name });

    row.querySelector('a.record').addEventListener('mousedown', function(evt) {

      this.setAttribute('data-recording', true);
      recording = true;

    });

    row.querySelector('a.record').addEventListener('mouseup', function(evt) {

      this.setAttribute('data-recording', false);
      recording = false;

      gest.addMatch(recordedGesture);
      recordedGesture.splice(0, recordedGesture.length);

      gp.train();

    });

    row.querySelector('input.name').addEventListener('change', function(evt) {

      gest.name = this.value;

    });

    document.getElementById('correlation').querySelector('tbody').appendChild(row);

  });

  document.getElementById('getResults').addEventListener('click', function(evt) {

    evt.preventDefault();
    evt.stopPropagation();

    if(gp.gestures.length < 2)
      return;

    function compareCorrelationDesc(gestA, gestB) {
      return gestB.correlation - gestA.correlation;
    }

    function getNextBestCorrelation(value) {
      var gestures = gp.gestures;
      var gestMax = null;

      for(var i = 0; i < gestures.length; i++) {
        if (gestures[i].correlation < value && (gestMax == null || gestures[i].correlation > gestMax.correlation))
          gestMax = gestures[i];
      }
      return gestMax;
    }

    //var gestMax = gp.gestures.sort(compareCorrelationDesc)[0];
    var gestMax =     getNextBestCorrelation(2);
    var gestAgainst = getNextBestCorrelation(gestMax.correlation);

    var table = document.getElementById('results').getElementsByTagName('tbody')[0];

    var row = table.insertRow(table.rows.length);

    var cellGest = row.insertCell();
    cellGest.innerHTML = gestMax.name;

    var cellCorr = row.insertCell();
    var floatCorr = parseFloat(gestMax.correlation);
    cellCorr.innerHTML = floatCorr.toFixed(3);

    var cellCert = row.insertCell();
    var floatCert = parseFloat(gestMax.correlation - gestAgainst.correlation);
    cellCert.innerHTML = floatCert.toFixed(3);

    
    table = document.getElementById('results').getElementsByTagName('tfoot')[0];
    if(table.rows.length == 1) {
      var row = table.insertRow(0),
          strCell = row.insertCell();

      strCell.innerHTML = 'Average';
      row.insertCell();
      row.insertCell();

      row = table.insertRow(1);
      strCell = row.insertCell();

      strCell.innerHTML = 'Dev';
      row.insertCell();
      row.insertCell();
    }

    results[0].push(floatCorr);
    results[1].push(floatCert);

    var n = results[0].length,
        sum = [results[0].reduce(function(a, b){ return a + b;}) , results[1].reduce(function(a, b){ return a + b;})],
        avg = [sum[0] / n , sum[1]/n ],
        std = [results[0].reduce(function(a, b) { return a + Math.pow(b - avg[0], 2) }, 0) , results[1].reduce(function(a, b) { return a + Math.pow(b - avg[1], 2) }, 0)];

    std = [Math.sqrt(std[0] / n) , Math.sqrt(std[1] / n )];

    var avgCell = table.rows[0].cells[1],
        stdCell = table.rows[1].cells[1];

    avgCell.innerHTML = avg[0].toFixed(3);

    avgCell = table.rows[0].cells[2];
    avgCell.innerHTML = avg[1].toFixed(3);

    stdCell.innerHTML = std[0].toFixed(3);

    stdCell = table.rows[1].cells[2];
    stdCell.innerHTML = std[1].toFixed(3);

  });

  window.addEventListener('keypress', function(evt){

    //updateGestureLog(String.fromCharCode(evt.which));
  });

  function updateGestureLog(gestureName) {

    var el = document.getElementById('gesture-log').querySelector('p');
    el.innerHTML += gestureName + ' ';

  }


  document.getElementById('reset').addEventListener('click', function(evt){

    evt.preventDefault();
    evt.stopPropagation();

    results = [[],[]];

    var table = document.getElementById('results').getElementsByTagName('tfoot')[0];
    if (table.rows.length > 1){
      table.deleteRow(0);
      table.deleteRow(0);
    }

    table = document.getElementById('results').getElementsByTagName('tbody')[0];
    while (table.rows.length > 0){
      table.deleteRow(0);
    }

  });

  (function() {
   
    var s1 = true,
        s2 = true,
        threshold = 0.7,
        lastCorr = null;

    document.getElementById('thresh').addEventListener('change', function() {

      var thr = parseFloat(this.value);
      if(!isNaN(thr) && thr > 0 && thr <= 1) threshold = thr;

      console.log(threshold);
    });

    console.log(threshold)

    setInterval(function() {

      if(!gp.trained) return;

      var corr = gp.correlate(dataBuffer),
          maxCorr = (function(corr) {
            var ret = { corr: -1, index: -1 };
            for(var i in corr)
              if(corr[i] > ret.corr)
                ret = { corr: corr[i], index: i };
            return ret;
          }(corr));

      gp.render();

      if(maxCorr.corr > threshold) {
        if(s1 === s2 || lastCorr !== maxCorr.index) {

          var chr = gp.gestures[parseInt(maxCorr.index.replace('gesture', ''))].name;
          updateGestureLog(chr);

          if(s1 === s2) s1 = !s1;
        } else {
          // nop
        }
      } else if(maxCorr.corr < threshold && s1 !== s2) {
        s2 = !s2;
      }

      lastCorr = maxCorr.index;
    }, 50);
  }());

  /*window.addEventListener('keydown', function(evt) {
    if(evt.shiftKey)
      recording.recording = true;
  });

  window.addEventListener('keyup', function(evt) {
    recording.recording = false;
  });*/

  controller.on('frame', function(frame) {

    if(frame.valid && 
       frame.hands.length === 1 /*&& 
       frame.hands[0].type === 'left'*/) {

      var h = frame.hands[0], framedata = [];

      framedata.push.apply(framedata, h.palmNormal);

      for(var i = 0; i < h.fingers.length; i++) {
        for(var j = 0; j < h.fingers[i].bones.length; j++)
          framedata.push.apply(framedata, h.fingers[i].bones[j].direction());
          //framedata.push.apply(framedata, h.fingers[i].direction);
        }

      if(recording)
        recordedGesture.push(framedata);
      recording = false;

      //recordedGesture.push.apply(recordedGesture, framedata);

      dataBuffer.push.apply(dataBuffer, framedata);

    }

  });

  controller.connect();

});
