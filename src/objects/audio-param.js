(function(T) {
	"use strict";

	// {defaultValue: Number, bpmTimeline: BPMTimeline, units: "beats" || "seconds"}
	function AudioParamNode(_args) {
		T.Object.call(this, 2, _args);

		var _ = this._;

		_.units = 'beats';
		_.bpmTimeline = undefined;
		_.defaultValue = 0;
		_.automation = new timbre.modules.PseudoAudioParam(_.defaultValue);
		_.changed = false;

		_.plotFlush = true;
		_.ar = false;
	}
	timbre.fn.extend(AudioParamNode);

	var $ = AudioParamNode.prototype;

	Object.defineProperties($, {
		bpmTimeline : {
			get : function() {
				return this._.bpmTimeline;
			}, 
			set : function(value) {
				this._.bpmTimeline = value;
				this._.changed = true;
			}
		}, 
		automation : {
			get : function() {
				return this._.automation;
			}, 
			set : function(value) {
				if (value instanceof timbre.modules.PseudoAudioParam) {
					this._.automation = value;
					this._.changed = true;
				}
			}
		}, 
		units : {
			set : function(value) {
				this._.units = value;
			},
			get : function() {
				return this._.units;
			}
		}, 
		defaultValue : {
			get : function() {
				return this._.automation.value();
			}, 
			set : function(value) {
				this._.automation.default.value = value;
				this._.changed = true;
			}
		}

	});

	$.getValueAt = function(time, fromUnits) {
		if (this.units === fromUnits) {
			return this.automation.getValueAt(time);
		}
		if (this.units === 'beats') {
			return this.automation.getValueAtTime(this.bpmTimeline.beats(time));
		}
		if (this.units === 'seconds') {
			return this.automation.getValueAtTime(this.bpmTimeline.seconds(time));	
		}
	};

	$.setValueAtTime = function(value, startTime) {
		this._.automation.setValueAtTime(value, startTime);
		this._.plotFlush = true;
		this._.changed = true;
	};

	$.linearRampToValueAtTime = function(value, endTime) {
		this._.automation.linearRampToValueAtTime(value, endTime);
		this._.plotFlush = true;
		this._.changed = true;
	};

	$.exponentialRampToValueAtTime = function(value, endTime) {
		this._.automation.exponentialRampToValueAtTime(value, endTime);
		this._.plotFlush = true;
		this._.changed = true;
	};

	$.setTargetAtTime = function(value, startTime, timeConstant) {
		this._.automation.setTargetAtTime(value, startTime, timeConstant);
		this._.plotFlush = true;
		this._.changed = true;
	};

	$.setValueCurveAtTime = function(value, startTime, duration) {
		this._.automation.setValueCurveAtTime(value, startTime, duration);
		this._.plotFlush = true;
		this._.changed = true;
	};

	$.cancelScheduledValues = function(time) {
		this._.automation.cancelScheduledValues(time);
		// if (this._.automation.events.length === 0) 
		// 	this._.automation.setValueAtTime(this._.automation.value(), 0);
		this._.plotFlush = true;
		this._.changed = true;
	};

	$.cancelAllEvents = function() {
		this._.automation.cancelAllEvents();
		// this._.automation.setValueAtTime(this._.automation.value(), 0);
		this._.plotFlush = true;
		this._.changed = true;
	};

	$.process = function(tickID) {
		var _ = this._;
		if (this.tickID !== tickID || this._.changed) {
			this.tickID = tickID;

			var cellL = this.cells[1];
			var cellR = this.cells[2];
			var i, imax = _.cellsize;

			var currentTime = this.timeContext.currentTime / 1000; // to seconds

			if (this.nodes.length) {
				timbre.fn.inputSignalAR(this);
			} else {
				for (i = 0; i < imax; ++i) {
					cellL[i] = cellR[i] = 1;
				}
			}

			if (_.ar) {
				for (i = 0; i < imax; ++i) {
					// TODO: the AR option was not tested!
					var time = (this.units === 'beats')? this.bpmTimeline.beats(currentTime) : currentTime;
					var value = _.automation.getValueAtTime(time, this.units);
					cellL[i] *= value;
					cellR[i] *= value;
					currentTime += 1000 / this._.sampleRate;
				}
			} else {
				var time = (this.units === 'beats')? this.bpmTimeline.beats(currentTime) : currentTime;
				var value = _.automation.getValueAtTime(time, this.units);
				// console.log([currentTime, time, value]);
				for (i = 0; i < imax; ++i) {
					cellL[i] *= value;
					cellR[i] *= value;
				}
			}

			timbre.fn.outputSignalAR(this);
		}

		this._.changed = false;

		return this;
	}

	$.plot = function(opts) {
		var _ = this;
		if (_.plotFlush) {
			var data = new Float32Array(128);
			// TODO
			_.plotData  = data;
			_.plotRange = [0, 1];
			_.plotFlush = null;
		}
		return super_plot.call(this, opts);
		// TODO
	}

	timbre.fn.register("audio-param", AudioParamNode);
})(timbre);