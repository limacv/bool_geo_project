// import {PLYExporter} from "../../../../libs/exporters/PLYExporter.js"

function loadFont(url) {
    return new Promise(resolve => {
        new THREE.FontLoader().load(url, resolve);
    });
}

function hsv2pos(hsv) {
    return new THREE.Vector3(
        (hsv.h - 180) / 2 * Math.cos(hsv.v * Math.PI / 2) * Math.cos(hsv.s * 2 * Math.PI),
        (hsv.h - 180) / 2 * Math.cos(hsv.v * Math.PI / 2) * Math.sin(hsv.s * 2 * Math.PI),
        (hsv.h - 180) / 2 * Math.sin(hsv.v * Math.PI / 2)
    );
}

function ABS(a) { return a > 0 ? a : -a; }
function MIN(a, b, c) { return a < b && a < c ? a : (b < c ? b : c); }
function SIGN(a) { return a > 0 ? 1 : -1; }
// generate nv coordinate based on normal direction
function generateUV(geometry, scale = 1) {
    geometry.computeBoundingBox();
    var max = geometry.boundingBox.max,
        min = geometry.boundingBox.min;
    var offset = new THREE.Vector3(0 - min.x, 0 - min.y, 0 - min.z);
    var range = scale * MIN(max.x - min.x, max.y - min.y, max.z - min.z);
    var faces = geometry.faces;
    var facenum = faces.length;
    var uvnum = geometry.faceVertexUvs[0].length;
    if (facenum != uvnum)
        throw "it's not right!";

    geometry.faceVertexUvs[0] = [];

    for (var i = 0; i < faces.length; i++) {

        var v1 = geometry.vertices[faces[i].a],
            v2 = geometry.vertices[faces[i].b],
            v3 = geometry.vertices[faces[i].c];

        var vec1 = new THREE.Vector3(),
            vec2 = new THREE.Vector3(),
            vnormal = new THREE.Vector3();
        vec1.subVectors(v1, v2);
        vec2.subVectors(v1, v3);
        vnormal = vec1.cross(vec2);
        var x = ABS(vnormal.x), sx = SIGN(vnormal.x),
            y = ABS(vnormal.y), sy = SIGN(vnormal.y),
            z = ABS(vnormal.z), sz = SIGN(vnormal.z);
        if (z > x && z > y)
            geometry.faceVertexUvs[0].push([
                new THREE.Vector2(sz * (v1.x + offset.x) / range, (v1.y + offset.y) / range),
                new THREE.Vector2(sz * (v2.x + offset.x) / range, (v2.y + offset.y) / range),
                new THREE.Vector2(sz * (v3.x + offset.x) / range, (v3.y + offset.y) / range)
            ]);
        else if (x > y)
            geometry.faceVertexUvs[0].push([
                new THREE.Vector2(- sx * (v1.z + offset.z) / range, (v1.y + offset.y) / range),
                new THREE.Vector2(- sx * (v2.z + offset.z) / range, (v2.y + offset.y) / range),
                new THREE.Vector2(- sx * (v3.z + offset.z) / range, (v3.y + offset.y) / range)
            ]);
        else
            geometry.faceVertexUvs[0].push([
                new THREE.Vector2(- sy * (v1.x + offset.x) / range, (v1.z + offset.z) / range),
                new THREE.Vector2(- sy * (v2.x + offset.x) / range, (v2.z + offset.z) / range),
                new THREE.Vector2(- sy * (v3.x + offset.x) / range, (v3.z + offset.z) / range)
            ]);
    }
    geometry.uvsNeedUpdate = true;
}

function downloadFile(fileName, content) {
    var aLink = document.createElement('a');
    aLink.download = fileName;
    aLink.href = "data:text/plain," + content;
    aLink.click();
}
function exportAndDownload(scene) {
    var expo = new PLYExporter();
    var data = expo.parse(scene);
    downloadFile("123.ply", data)
}

function createTweenScrubber(tween, seekSpeed) {
    seekSpeed = seekSpeed || 0.001;

    function stop() {
        TweenMax.to(tween, 1, { timeScale: 0 });
    }

    function resume() {
        TweenMax.to(tween, 1, { timeScale: 1 });
    }

    function seek(dx) {
        var progress = tween.progress();
        var p = THREE.Math.clamp((progress + (dx * seekSpeed)), 0, 1);

        tween.progress(p);
    }

    var _cx = 0;

    // desktop
    var mouseDown = false;
    document.body.style.cursor = 'pointer';

    window.addEventListener('mousedown', function (e) {
        mouseDown = true;
        document.body.style.cursor = 'ew-resize';
        _cx = e.clientX;
        stop();
    });
    window.addEventListener('mouseup', function (e) {
        mouseDown = false;
        document.body.style.cursor = 'pointer';
        resume();
    });
    window.addEventListener('mousemove', function (e) {
        if (mouseDown === true) {
            var cx = e.clientX;
            var dx = cx - _cx;
            _cx = cx;

            seek(dx);
        }
    });
    // mobile
    window.addEventListener('touchstart', function (e) {
        _cx = e.touches[0].clientX;
        stop();
        e.preventDefault();
    });
    window.addEventListener('touchend', function (e) {
        resume();
        e.preventDefault();
    });
    window.addEventListener('touchmove', function (e) {
        var cx = e.touches[0].clientX;
        var dx = cx - _cx;
        _cx = cx;

        seek(dx);
        e.preventDefault();
    });
}


export { generateUV, exportAndDownload, loadFont, hsv2pos, createTweenScrubber }