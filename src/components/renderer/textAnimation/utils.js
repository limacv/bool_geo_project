export var utils = {
    extend: function (dst, src) {
        for (var key in src) {
            dst[key] = src[key];
        }

        return dst;
    },
    randSign: function () {
        return Math.random() > 0.5 ? 1 : -1;
    },
    ease: function (ease, t, b, c, d) {
        return b + ease.getRatio(t / d) * c;
    },
    // mapEase:function(ease, v, x1, y1, x2, y2) {
    //   var t = v;
    //   var b = x2;
    //   var c = y2 - x2;
    //   var d = y1 - x1;
    //
    //   return utils.ease(ease, t, b, c, d);
    // },
    fibSpherePoint: (function () {
        var v = { x: 0, y: 0, z: 0 };
        var G = Math.PI * (3 - Math.sqrt(5));

        return function (i, n, radius) {
            var step = 2.0 / n;
            var r, phi;

            v.y = i * step - 1 + (step * 0.5);
            r = Math.sqrt(1 - v.y * v.y);
            phi = i * G;
            v.x = Math.cos(phi) * r;
            v.z = Math.sin(phi) * r;

            radius = radius || 1;

            v.x *= radius;
            v.y *= radius;
            v.z *= radius;

            return v;
        }
    })()
};