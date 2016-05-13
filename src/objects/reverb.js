(function(T) {
    "use strict";

    var fn = T.fn;
    var Reverb = T.modules.Reverb;

    function ReverbNode(_args) {
        T.Object.call(this, 2, _args);
        fn.fixAR(this);

        this._._room = T(0.5);
        this._._damp = T(0.5);
        this._._mix = T(0.33);

        this._.reverb = new Reverb(this._.sampleRate, this._.cellsize);
    }
    fn.extend(ReverbNode);

    var $ = ReverbNode.prototype;

    Object.defineProperties($, {
        room: {
            set: function(value) {
                this._._room = T(value);
            },
            get: function() {
                return this._._room;
            }
        },
        damp: {
            set: function(value) {
                this._._damp = T(value);
            },
            get: function() {
                return this._._damp;
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

            _.reverb.setRoomSize(Math.min(1, Math.max(0,_._room.process(tickID).cells[0][0])));
            _.reverb.setDamp(Math.min(1, Math.max(0,_._damp.process(tickID).cells[0][0])));
            _.reverb.wet = Math.min(1, Math.max(0,_._mix.process(tickID).cells[0][0]));

            if (!_.bypassed) {
                _.reverb.process(this.cells[1], this.cells[2]);
            }

            fn.outputSignalAR(this);
        }

        return this;
    };

    fn.register("reverb", ReverbNode);

})(timbre);
