(function(T) {
    "use strict";

    var fn  = T.fn;
    var Chorus = T.modules.Chorus;

    function ChorusNode(_args) {
        T.Object.call(this, 2, _args);
        fn.fixAR(this);

        this._._delay = T(20);
        this._._rate = T(4);
        this._._depth = T(20);
        this._._feedback = T(0.2);
        this._._mix = T(0.3);

        var chorus = new Chorus(this._.sampleRate);
        chorus.setDelayTime(20);
        chorus.setRate(4);
        chorus.depth = 20;
        chorus.feedback = 0.2;
        chorus.wet = 0.33;
        this._.chorus = chorus;
    }
    fn.extend(ChorusNode);

    var $ = ChorusNode.prototype;

    Object.defineProperties($, {
        type: {
            set: function(value) {
                this._.chorus.setDelayTime(value);
            },
            get: function() {
                return this._.chorus.wave;
            }
        },
        delay: {
            set: function(value) {
                this._._delay = T(value);
            },
            get: function() {
                return this._._delay;
            }
        },
        rate: {
            set: function(value) {
                this._._rate = T(value);
            },
            get: function() {
                return this._._rate;
            }
        },
        depth: {
            set: function(value) {
                this._._depth = T(value);
            },
            get: function() {
                return this._._depth;
            }
        },
        fb: {
            set: function(value) {
                this._._fb = T(value);
            },
            get: function() {
                return this._._fb;
            }
        },
        mix: {
            set: function(value) {
                this._._mix = T(value);
            },
            get: function() {
                return this._._mix;
            }
        }
    });

    $.process = function(tickID) {
        var _ = this._;

        if (this.tickID !== tickID) {
            this.tickID = tickID;

            fn.inputSignalAR(this);

            _.chorus.setDelayTime(Math.min(80, Math.max(0.5, _._delay.process(tickID).cells[0][0])));
            _.chorus.setRate(Math.max(0, _._rate.process(tickID).cells[0][0]));
            _.chorus.depth = Math.min(100, Math.max(0, _._depth.process(tickID).cells[0][0])) * this._.sampleRate / 44100;
            _.chorus.feedback = Math.min(1, Math.max(-1, _._feedback.process(tickID).cells[0][0])) * 0.99996;
            _.chorus.wet = _._mix.process(tickID).cells[0][0];

            if (!_.bypassed) {
                _.chorus.process(this.cells[1], this.cells[2]);
            }

            fn.outputSignalAR(this);
        }

        return this;
    };

    fn.register("chorus", ChorusNode);

})(timbre);
