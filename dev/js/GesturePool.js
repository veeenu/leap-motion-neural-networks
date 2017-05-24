define(['Gesture', 'brain'], function(Gesture, brain) {

  var _buildOutputSet = function(cur, count) {
    var obj = {};

    for(var i = 0; i < count; i++)
      obj['gesture' + i] = (i === cur ? 1 : 0);
    
    return obj;
  }

  var GesturePool = function() {
    this.gestures = [];
    this.annOptions = {
      learningRate: 0.2,
      iterations: 1,
      log: true
    };
    this.trained = false;
  }

  GesturePool.prototype.add = function(gest) {
    for(var i = 0; i < this.gestures.length; i++)
      if(this.gestures[i] === gest) return;

    this.gestures.push(gest);
  }

  GesturePool.prototype.getLength = function() {
  
    var shortestInput = Number.POSITIVE_INFINITY;

    for(var i = 0, loc; i < this.gestures.length; i++) {
      loc = this.gestures[i].getLength();
      if(loc < shortestInput) shortestInput = loc;
    }

    return shortestInput;

  }

  GesturePool.prototype.train = function() {
  
    var len = this.getLength(), allData = [];

    this.ann = new brain.NeuralNetwork(this.annOptions);

    for(var i = 0, l = this.gestures.length; i < l; i++) {
      for(var j = 0, 
              gdata = this.gestures[i].getTrainingData(len),
              os = _buildOutputSet(i, l); j < gdata.length; j++) {
        allData.push({ input: gdata[j], output: os });
      }
    }

    this.ann.train(allData);
    this.trained = true;

  }

  GesturePool.prototype.correlate = function(buffer) {

    var subBuf = buffer.slice(-this.getLength());
    this.correlations = this.ann.run(subBuf);

    for(var i in this.correlations) {

      var index = parseInt(i.replace('gesture', ''));
      this.gestures[index].correlation = this.correlations[i];

    }

    return this.correlations;

  }

  GesturePool.prototype.render = function() {
  
    for(var i = 0; i < this.gestures.length; i++)
      this.gestures[i].render();

  }

  return GesturePool;

});
