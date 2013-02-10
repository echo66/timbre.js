(function(T) {
    "use strict";
    
    function Decoder() {}
    
    Decoder.prototype.decode = function(src, onloadedmetadata, onloadeddata) {
        if (typeof src === "string") {
            if (/\.wav$/.test(src)) {
                return Decoder.wav_decode(src, onloadedmetadata, onloadeddata);
            } else if (Decoder.ogg_decode && /\.ogg$/.test(src)) {
                return Decoder.ogg_decode(src, onloadedmetadata, onloadeddata);
            } else if (Decoder.mp3_decode && /\.mp3$/.test(src)) {
                return Decoder.mp3_decode(src, onloadedmetadata, onloadeddata);
            }
        }
        if (Decoder.webkit_decode) {
            return Decoder.webkit_decode(src, onloadedmetadata, onloadeddata);
        } else if (Decoder.moz_decode) {
            return Decoder.moz_decode(src, onloadedmetadata, onloadeddata);
        }
        onloadedmetadata(false);
    };
    T.modules.Decoder = Decoder;
    
    if (T.envtype === "browser") {
        Decoder.getBinaryWithPath = function(path, callback) {
            T.fn.fix_iOS6_1_problem(true);
            
            var xhr = new XMLHttpRequest();
            xhr.open("GET", path, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function() {
                if (xhr.status === 200) {
                    if (xhr.response) {
                        callback(new Uint8Array(xhr.response));
                    } else if (xhr.responseBody !== undefined) {
                        /*global VBArray:true */
                        var res = VBArray(xhr.responseBody).toArray();
                        var i, imax = res.length;
                        var a = new Array(imax);
                        for (i = 0; i < imax; ++i) {
                            a[i] = res[i];
                        }
                        callback(new Uint8Array(a));
                        /*global VBArray:false */
                    }
                } else {
                    callback(xhr.status + " " + xhr.statusText);
                }
                T.fn.fix_iOS6_1_problem(false);
            };
            xhr.send();
        };
    } else {
        Decoder.getBinaryWithPath = function(path, callback) {
            callback("no support");
        };
    }
    
    var deinterleave = function(list) {
        var result = new list.constructor(list.length>>1);
        var i, j, jmax = result.length;
        if (list.length % 2) {
            j |= 0;
        }
        for (i = j = 0; j < jmax; ++j, i += 2) {
            result[j] = (list[i] + list[i+1]) * 0.5;
        }
        return result;
    };
    
    var _24bit_to_32bit = function(uint8) {
        var b0, b1, b2, bb, x;
        var int32 = new Int32Array(uint8.length / 3);
        for (var i = 0, imax = uint8.length, j = 0; i < imax; ) {
            b0 = uint8[i++] ,b1 = uint8[i++], b2 = uint8[i++];
            bb = b0 + (b1 << 8) + (b2 << 16);
            x = (bb & 0x800000) ? bb - 16777216 : bb;
            int32[j++] = x;
        }
        return int32;
    };
    
    Decoder.wav_decode = function(src, onloadedmetadata, onloadeddata) {
        Decoder.getBinaryWithPath(src, function(data) {
            if (String.fromCharCode(data[0], data[1], data[2], data[3]) !== "RIFF") {
                return onloadedmetadata(false);
            }
            
            var l1 = data[4] + (data[5]<<8) + (data[6]<<16) + (data[7]<<24);
            if (l1 + 8 !== data.length) {
                return onloadedmetadata(false);
            }
            
            if (String.fromCharCode(data[8], data[9], data[10], data[11]) !== "WAVE") {
                return onloadedmetadata(false);
            }
            
            if (String.fromCharCode(data[12], data[13], data[14], data[15]) !== "fmt ") {
                return onloadedmetadata(false);
            }
            
            var channels   = data[22] + (data[23]<<8);
            var samplerate = data[24] + (data[25]<<8) + (data[26]<<16) + (data[27]<<24);
            var bitSize    = data[34] + (data[35]<<8);
            
            if (String.fromCharCode(data[36], data[37], data[38], data[39]) !== "data") {
                return onloadedmetadata(false);
            }
            
            var l2 = data[40] + (data[41]<<8) + (data[42]<<16) + (data[43]<<24);
            var duration = ((l2 / channels) >> 1) / samplerate;
            
            if (l2 > data.length - 44) {
                return onloadedmetadata(false);
            }
            
            var buffer = new Float32Array((duration * samplerate)|0);
            
            onloadedmetadata({
                samplerate: samplerate,
                buffer    : buffer,
                duration  : duration
            });
            
            if (bitSize === 8) {
                data = new Int8Array(data.buffer, 44);
            } else if (bitSize === 16) {
                data = new Int16Array(data.buffer, 44);
            } else if (bitSize === 32) {
                data = new Int32Array(data.buffer, 44);
            } else if (bitSize === 24) {
                data = _24bit_to_32bit(new Uint8Array(data.buffer, 44));
            }
            
            if (channels === 2) {
                data = deinterleave(data);
            }
            
            var k = 1 / ((1 << (bitSize-1)) - 1);
            for (var i = 0, imax = buffer.length; i < imax; ++i) {
                buffer[i] = data[i] * k;
            }
            
            onloadeddata();
        });
    };
    
    
    Decoder.webkit_decode = (function() {
        if (typeof webkitAudioContext !== "undefined") {
            var ctx = T.fn._audioContext;
            var _decode = function(data, onloadedmetadata, onloadeddata) {
                var samplerate, duration, buffer;
                if (typeof data === "string") {
                    return onloadeddata(false);
                }
                
                try {
                    buffer = ctx.createBuffer(data.buffer, true);
                } catch (e) {
                    return onloadedmetadata(false);
                }
                
                samplerate = ctx.sampleRate;
                buffer     = buffer.getChannelData(0);
                duration   = buffer.length / samplerate;
                
                onloadedmetadata({
                    samplerate: samplerate,
                    buffer    : buffer,
                    duration  : duration
                });
                
                onloadeddata();
            };
            
            return function(src, onloadedmetadata, onloadeddata) {
                /*global File:true */
                if (src instanceof File) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        _decode(new Uint8Array(e.target.result),
                                onloadedmetadata, onloadeddata);
                    };
                    reader.readAsArrayBuffer(src);
                } else {
                    Decoder.getBinaryWithPath(src, function(data) {
                        _decode(data, onloadedmetadata, onloadeddata);
                    });
                }
                /*global File:false */
            };
        }
    })();
    
    Decoder.moz_decode = (function() {
        if (typeof Audio === "function" && typeof new Audio().mozSetup === "function") {
            return function(src, onloadedmetadata, onloadeddata) {
                var samplerate, duration, buffer;
                var writeIndex = 0;
                
                var audio = new Audio(src);
                audio.volume = 0.0;
                audio.speed  = 4;
                audio.addEventListener("loadedmetadata", function() {
                    samplerate = audio.mozSampleRate;
                    duration = audio.duration;
                    buffer = new Float32Array((audio.duration * samplerate)|0);
                    if (audio.mozChannels === 2) {
                        audio.addEventListener("MozAudioAvailable", function(e) {
                            var samples = e.frameBuffer;
                            for (var i = 0, imax = samples.length; i < imax; i += 2) {
                                buffer[writeIndex++] = (samples[i] + samples[i+1]) * 0.5;
                            }
                        }, false);
                    } else {
                        audio.addEventListener("MozAudioAvailable", function(e) {
                            var samples = e.frameBuffer;
                            for (var i = 0, imax = samples.length; i < imax; ++i) {
                                buffer[writeIndex++] = samples[i];
                            }
                        }, false);
                    }
                    audio.play();
                    setTimeout(function() {
                        onloadedmetadata({
                            samplerate: samplerate,
                            buffer    : buffer,
                            duration  : duration
                        });
                    }, 1000);
                }, false);
                audio.addEventListener("ended", function() {
                    onloadeddata();
                }, false);
                audio.load();
            };
        }
    })();
})(timbre);
