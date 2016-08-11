(function(T) {
    "use strict";

    var fn = T.fn;
    var Tape = T.modules.Scissor.Tape;
    var isSignalArray = function(obj) {
        return fn.isSignalArray(obj) || obj instanceof Float32Array;
    };

    function BufferNode(_args) {
        T.Object.call(this, 1, _args);
        fn.fixAR(this);

        var _ = this._;
        _.pitch      = T(1);
        _.sampleRate = 44100;
        _.channels   = 0;
        _.bufferMix  = null;
        _.buffer     = [];
        _.isLooped   = false;
        _.loopData   = { phaseMin: undefined, phaseMax: undefined }; 
        _.isReversed = false;
        _.duration    = 0;
        _.currentTime = 0;
        _.currentTimeObj = null;
        _.phase = 0;
        _.phaseIncr = 0;
        _.onended  = fn.make_onended(this, 0);
        _.onlooped = make_onlooped(this);
    }
    fn.extend(BufferNode);

    var make_onlooped = function(self) {
        return function() {
            var _ = self._;
            if (_.phase >= _.buffer[0].length) {
                _.phase = 0;
            } else if (_.phase < 0) {
                _.phase = _.buffer[0].length + _.phaseIncr;
            }
            self._.emit("looped");
        };
    };

    var $ = BufferNode.prototype;

    var setBuffer = function(value) {
        var _ = this._;
        if (typeof value === "object") {
            var buffer = [], sampleRate, channels;

            if (isSignalArray(value)) {
                buffer[0] = value;
                channels = 1;
            } else if (typeof value === "object") {
                if (value instanceof T.Object) {
                    value = value.buffer;
                } else if (value instanceof Tape) {
                    value = value.getBuffer();
                }
                if (Array.isArray(value.buffer)) {
                    if (isSignalArray(value.buffer[0])) {
                        if (isSignalArray(value.buffer[1]) &&
                            isSignalArray(value.buffer[2])) {
                            channels = 2;
                            buffer = value.buffer;
                        } else {
                            channels = 1;
                            buffer = [value.buffer[0]];
                        }
                    }
                } else if (isSignalArray(value.buffer)) {
                    channels = 1;
                    buffer = [value.buffer];
                }
                if (typeof value.sampleRate === "number") {
                    sampleRate = value.sampleRate;
                }
            }
            if (buffer.length) {
                if (sampleRate > 0) {
                    _.sampleRate = value.sampleRate;
                }
                _.bufferMix = null;
                _.buffer  = buffer;
                _.phase     = 0;
                _.phaseIncr = _.sampleRate / T.sampleRate;
                _.duration  = _.buffer[0].length * 1000 / _.sampleRate;
                _.currentTime = 0;
                _.plotFlush = true;
                if (_.isLooped) {
                    _.loopData.phaseMin = 0;
                    _.loopData.phaseMax = _.buffer[0].length - 1;
                }
                this.reverse(_.isReversed);
            }
        }
    };

    Object.defineProperties($, {
        buffer: {
            set: setBuffer,
            get: function() {
                var _ = this._;
                return {
                    sampleRate: _.sampleRate,
                    channels  : _.channels,
                    buffer    : _.buffer
                };
            }
        },
        pitch: {
            set: function(value) {
                this._.pitch = T(value);
            },
            get: function() {
                return this._.pitch;
            }
        },
        isLooped: {
            get: function() {
                return this._.isLooped;
            }
        },
        loopStart: {
            get: function() {
                if (this.isLooped) 
                    return (this._.loopData.phaseMin * 1000) / this._.sampleRate;
                else
                    return undefined;
            }, 
            set: function(value) {
                if (this._.isLooped) 
                    this._.loopData.phaseMin = (value / 1000) * this._.sampleRate; // TODO: check if loopStart < loopEnd 
            }
        }, 
        loopEnd: {
            get: function() {
                if (this.isLooped) 
                    return (this._.loopData.phaseMax * 1000) / this._.sampleRate;
                else
                    return undefined;
            }, 
            set: function(value) {
                if (this._.isLooped) 
                    this._.loopData.phaseMax = (value / 1000) * this._.sampleRate; // TODO: check if loopStart < loopEnd 
            }
        }, 
        isReversed: {
            get: function() {
                return this._.isReversed;
            }
        },
        sampleRate: {
            get: function() {
                return this._.sampleRate;
            }
        },
        duration: {
            get: function() {
                return this._.duration;
            }
        },
        currentTime: {
            set: function(value) {
                if (typeof value === "number") {
                    var _ = this._;
                    if (0 <= value && value <= _.duration) {
                        _.phase = (value / 1000) * _.sampleRate;
                        _.currentTime = value;
                    }
                } else if (value instanceof T.Object) {
                    this._.currentTimeObj = value;
                } else if (value === null) {
                    this._.currentTimeObj = null;
                }
            },
            get: function() {
                if (this._.currentTimeObj) {
                    return this._.currentTimeObj;
                } else {
                    return this._.currentTime;
                }
            }
        }
    });

    $.clone = function() {
        var _ = this._;
        var instance = fn.clone(this);

        if (_.buffer.length) {
            setBuffer.call(instance, {
                buffer    : _.buffer,
                sampleRate: _.sampleRate,
                channels  : _.channels
            });
        }
        instance.loop(_.isLooped);
        instance.reverse(_.isReversed);

        return instance;
    };

    $.slice = function(begin, end) {
        var _ = this._;
        var instance = T(_.originkey);
        var isReversed = _.isReversed;

        if (_.buffer.length) {
            if (typeof begin === "number" ){
                begin = (begin * 0.001 * _.sampleRate)|0;
            } else {
                begin = 0;
            }
            if (typeof end === "number") {
                end   = (end   * 0.001 * _.sampleRate)|0;
            } else {
                end = _.buffer[0].length;
            }
            if (begin > end) {
                var tmp = begin;
                begin = end;
                end   = tmp;
                isReversed = !isReversed;
            }

            if (_.channels === 2) {
                setBuffer.call(instance, {
                    buffer   : [ fn.pointer(_.buffer[0], begin, end-begin),
                                 fn.pointer(_.buffer[1], begin, end-begin),
                                 fn.pointer(_.buffer[2], begin, end-begin) ],
                    sampleRate: _.sampleRate
                });
            } else {
                setBuffer.call(instance, {
                    buffer: fn.pointer(_.buffer[0], begin, end-begin),
                    sampleRate: _.sampleRate
                });
            }
            instance.playbackState = fn.PLAYING_STATE;
        }
        instance.loop(_.isLooped);
        instance.reverse(_.isReversed);

        return instance;
    };

    $.reverse = function(value) {
        var _ = this._;

        _.isReversed = !!value;
        if (_.isReversed) {
            if (_.phaseIncr > 0) {
                _.phaseIncr *= -1;
            }
            if (_.phase === 0 && _.buffer.length) {
                _.phase = _.buffer[0].length + _.phaseIncr;
            }
        } else {
            if (_.phaseIncr < 0) {
                _.phaseIncr *= -1;
            }
        }

        return this;
    };

    $.loop = function(value) {
        this._.isLooped = !!value;
        if (this._.isLooped && this._.loopData.phaseMin === undefined) {
            this._.loopData.phaseMin = 0
            this._.loopData.phaseMax = this._.buffer[0].length - 1;
        }
        return this;
    };

    $.bang = function(value) {
        this.playbackState = (value === false ? fn.FINISHED_STATE : fn.PLAYING_STATE);
        this._.phase = 0;
        this._.emit("bang");
        return this;
    };

    $.process = function(tickID) {
        var _ = this._;

        if (!_.buffer.length) {
            return this;
        }

        if (this.tickID !== tickID) {
            this.tickID = tickID;

            var cellL = this.cells[1];
            var cellR = this.cells[2];
            var phase  = _.phase;
            var i, imax = _.cellsize;

            var bufferL, bufferR;
            if (_.channels === 2) {
                bufferL = _.buffer[1];
                bufferR = _.buffer[2];
            } else {
                bufferL = bufferR = _.buffer[0];
            }

            if (_.currentTimeObj) {
                var pos = _.currentTimeObj.process(tickID).cells[0];
                var t, sr = _.sampleRate * 0.001;
                for (i = 0; i < imax; ++i) {
                    t = pos[i];
                    phase = t * sr;
                    cellL[i] = (bufferL[phase|0] || 0);
                    cellR[i] = (bufferR[phase|0] || 0);
                }
                _.phase = phase;
                _.currentTime = t;
            } else {
                var pitch  = _.pitch.process(tickID).cells[0][0];
                var phaseIncr = _.phaseIncr * pitch;
                var p;

                for (i = 0; i < imax; ++i) {
                    p = phase|0;
                    if (_.isReversed) {
                        if (this._.isLooped && p < this._.loopData.phaseMin) 
                            phase = p = this._.loopData.phaseMax;
                    } else {
                        if (this._.isLooped && p > this._.loopData.phaseMax) 
                            phase = p = this._.loopData.phaseMin;
                    }
                        
                    cellL[i] = (bufferL[p] || 0);
                    cellR[i] = (bufferR[p] || 0);
                    phase += phaseIncr;
                }

                // if (phase >= bufferL.length) {
                //     if (_.isLooped) {
                //         fn.nextTick(_.onlooped);
                //     } else {
                //         fn.nextTick(_.onended);
                //     }
                // } else if (phase < 0) {
                //     if (_.isLooped) {
                //         fn.nextTick(_.onlooped);
                //     } else {
                //         fn.nextTick(_.onended);
                //     }
                // }
                _.phase = phase;
                _.currentTime += this.timeContext.currentTimeIncr;
            }

            fn.outputSignalAR(this);
        }

        return this;
    };

    var super_plot = T.Object.prototype.plot;

    $.plot = function(opts) {
        var _ = this._;
        var bufferL, bufferR;
        if (_.plotFlush) {
            if (_.channels === 2) {
                bufferL = _.buffer[1];
                bufferR = _.buffer[2];
            } else {
                bufferL = bufferR = _.buffer[0];
            }
            var data = new Float32Array(2048);
            var x = 0, xIncr = bufferL.length / 2048;
            for (var i = 0; i < 2048; i++) {
                data[i] = (bufferL[x|0] + bufferR[x|0]) * 0.5;
                x += xIncr;
            }
            _.plotData  = data;
            _.plotFlush = null;
        }
        return super_plot.call(this, opts);
    };

    fn.register("buffer", BufferNode);

})(timbre);
