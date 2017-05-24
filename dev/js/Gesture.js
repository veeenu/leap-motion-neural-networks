define(['brain'], function(brain) {

  var Gesture = function(pool) {
  
    this.matches = [];
    this.trained = false;
    this.pool = pool;
    this.element = null;

    pool.add(this);

  }

  Gesture.prototype.addMatch = function(match) {
  
    for(var i = 0; i < match.length; i++)
      this.matches.push(match[i].slice(0));
    //this.matches.push(match.slice(0));

  }

  Gesture.prototype.getLength = function() {
  
    var shortestInput = Number.POSITIVE_INFINITY;

    for(var i = 0; i < this.matches.length; i++)
      if(this.matches[i].length < shortestInput) shortestInput = this.matches[i].length;

    return shortestInput;
  }

  Gesture.prototype.getTrainingData = function(len, output) {
  
    var data = [];

    for(var i = 0; i < this.matches.length; i++) {
      data.push(this.matches[i].slice(0, len));
    }

    return data;
  }

  Gesture.prototype.render = function() {
  
    if(!this.element) return;

    var floatval = parseFloat(this.correlation);

    this.element.querySelector('td.correlation span').textContent = floatval.toFixed(3);
    this.element.querySelector('td.correlation div').style.width = (floatval * 100).toFixed(3) + '%';
    this.element.querySelector('td.correlation div').style.opacity = floatval;
    this.element.querySelector('td.samples').textContent = parseInt(this.matches.length);

  }

  return Gesture;

});
