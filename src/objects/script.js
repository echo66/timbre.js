(function(T) {
    "use strict";

    var fn = T.fn;

    function ScriptProcessorNode(_args) {
        T.Object.call(this, 2, _args);
        fn.fixAR(this);

        var _ = this._;
        _.numberOfInputs = 0;
        _.numberOfOutputs = 0;
        _.bufferSize = 0;
        _.bufferMask = 0;
        _.duration   = 0;
        _.inputBufferL = null;
        _.inputBufferR = null;
        _.outputBufferL = null;
        _.outputBufferR = null;
        _.onaudioprocess = null;
        _.index = 0;
        this.once("init", oninit);
    }
    fn.extend(ScriptProcessorNode);

    var oninit = function() {
        var _ = this._;
        if (_.numberOfInputs === 0) {
            this.numberOfInputs = 1;
        }

        if (_.numberOfOutputs === 0) {
            this.numberOfOutputs = 1;
        }
        if (_.bufferSize === 0) {
            this.bufferSize = 1024;
        }
    };

    var $ = ScriptProcessorNode.prototype;

    Object.defineProperties($, {
        numberOfInputs: {
            set: function(value) {
                var _ = this._;
                if (_.numberOfInputs === 0) {
                    _.numberOfInputs = (value === 2) ? 2 : 1;
                }
            },
            get: function() {
                return this._.numberOfInputs;
            }
        },
        numberOfOutputs: {
            set: function(value) {
                var _ = this._;
                if (_.numberOfOutputs === 0) {
                    _.numberOfOutputs = (value === 2) ? 2 : 1;
                }
            },
            get: function() {
                return this._.numberOfOutputs;
            }
        },
        bufferSize: {
            set: function(value) {
                var _ = this._;
                if (_.bufferSize === 0) {
                    if ([16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384].indexOf(value) !== -1) {
                        _.bufferSize = value;
                        _.bufferMask = value - 1;
                        _.duration = value / _.sampleRate;

                        _.inputBuffers = new Array(2);
                        _.inputBuffers[0] = _.inputBufferL = new fn.SignalArray(value);
                        _.inputBuffers[1] = _.inputBufferR = _.inputBufferL;
                        if (_.numberOfInputs > 1) 
                            _.inputBuffers[1] = _.inputBufferR  = new fn.SignalArray(value);

                        _.outputBuffers = new Array(2);
                        _.outputBuffers[0] = _.outputBufferL = new fn.SignalArray(value);
                        _.outputBuffers[1] = _.outputBufferR = _.outputBufferL;
                        if (_.numberOfOutputs > 1) 
                            _.outputBuffers[1] = _.outputBufferR  = new fn.SignalArray(value);
                    }
                }
            },
            get: function() {
                return this._.bufferSize;
            }
        },
        onaudioprocess: {
            set: function(value) {
                if (typeof value === "function") {
                    this._.onaudioprocess = value;
                }
            },
            get: function() {
                return this._.onaudioprocess;
            }
        }
    });

    function AudioBuffer(self, buffers) {
        this.sampleRate = self._.sampleRate;
        this.length     = self._.bufferSize;
        this.duration   = self._.duration;
        this.numberOfChannels = buffers.length;
        this.getChannelData = function(n) {
            return buffers[n];
        };
    }

    function AudioProcessingEvent(self) {
        var _ = self._;
        this.node = self;
        this.playbackTime = self.timeContext.currentTime;
        this.inputBuffer  = new AudioBuffer(self, _.inputBuffers);
        this.outputBuffer = new AudioBuffer(self, _.outputBuffers);
    }

    $.process = function(tickID) {
        var _ = this._;

        if (this.tickID !== tickID) {
            this.tickID = tickID;

            var cellsize   = _.cellsize;
            var bufferMask = _.bufferMask;
            var begin = _.index;
            var end   = begin + cellsize;
            var buffer;
            var cellL  = this.cells[1];
            var cellR  = this.cells[2];

            fn.inputSignalAR(this);

            if (_.numberOfInputs === 2) {
                _.inputBufferL.set(cellL, begin);
                _.inputBufferR.set(cellR, begin);
            } else {
                buffer = _.inputBufferL;
                for (var i = 0; i < cellsize; i++) {
                    buffer[begin + i] = (cellL[i] + cellR[i]) * 0.5;
                }
            }

            cellL.set(_.outputBufferL.subarray(begin, end));
            cellR.set(_.outputBufferR.subarray(begin, end));

            _.index = end & bufferMask;

            if (_.index === 0 && _.onaudioprocess) {
                _.onaudioprocess(new AudioProcessingEvent(this));
                if (_.numberOfOutputs === 1) {
                    _.outputBufferR.set(_.outputBufferL);
                }
            }

            fn.outputSignalAR(this);
        }

        return this;
    };

    fn.register("script", ScriptProcessorNode);

})(timbre);
