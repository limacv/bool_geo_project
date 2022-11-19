import Renderer from "./components/renderer/renderer.js";
import { hsv2pos } from "./components/renderer/mylib/myfunc.js"

var params = {
    // effect mode
    mode: "Simple Text",

    boolgeo: {
        text1: 'HEY',
        text2: "HOW'S",
        text3: 'IT',
        text4: 'GOING',
        size: 3.5,
        buildGeo: () => { ren.buildBoolGeo(params.boolgeo); }
    },
    // geometry
    textparams: {
        text: "hello",
        size: 3,
        height: 3,
        bevelEnabled: true,
        bevelThickness: 1.5,
        bevelSize: 0.1,
        textureScale: 1
    },

    // material
    transparency: 0.1,
    displaceScale: 0.01,
    material: "TEST",
    // environment
    envmap: "Footballfield",
    shadowDir: { h: 280, s: 0.2, v: 0.4 },
    camType: "Orthographic",
    camAutoRotate: false,
    resetCam: () => { ren.ctrlcamOrtho.reset(); ren.ctrlcamPersp.reset(); },
    // debug
    axisVisible: false,
    cameraVisible: false
}
const ren = new Renderer(params);
ren.buildBoolGeo(params.boolgeo);
var gui = new dat.GUI();
gui.add(params, "mode", ["Bool Text", "Simple Text"]).onChange(function (val) {
    ren.geoNeedUpdate = true;
    ren.cameraNeedChangeViewpoint = true;
    if (val === "Bool Text") {
        params.textparams.size = 3;
        ren.buildBoolGeo(params.boolgeo);
        fNaivGeo.close();
        fBoolGeo.open();
    }
    else if (val === "Simple Text") {
        params.textparams.size = 3;
        fNaivGeo.open();
        fBoolGeo.close();
    }
}).listen();

var fBoolGeo = gui.addFolder('Bool Text');
fBoolGeo.add(params.boolgeo, "text1");
fBoolGeo.add(params.boolgeo, "text2");
fBoolGeo.add(params.boolgeo, "text3");
fBoolGeo.add(params.boolgeo, "text4");
fBoolGeo.add(params.boolgeo, "size", 0.1, 10);
fBoolGeo.add(params.boolgeo, "buildGeo").onFinishChange(
    function (val) { ren.geoNeedUpdate = true; }
);

var fNaivGeo = gui.addFolder('Simple Text');
fNaivGeo.add(params.textparams, "text").onChange(function (val) {
    ren.geoNeedUpdate = true;
})
fNaivGeo.add(params.textparams, "size", 0.1, 40).onChange(function (val) {
    ren.geoNeedUpdate = true;
})
fNaivGeo.add(params.textparams, "height", 0.1, 10).onChange(function (val) {
    ren.geoNeedUpdate = true;
})
fNaivGeo.add(params.textparams, "bevelEnabled").onChange(function (val) {
    ren.geoNeedUpdate = true;
})
fNaivGeo.add(params.textparams, "bevelThickness", 0, 2).onChange(function (val) {
    ren.geoNeedUpdate = true;
})
fNaivGeo.add(params.textparams, "bevelSize", 0, 1).onChange(function (val) {
    ren.geoNeedUpdate = true;
})
fNaivGeo.add(params.textparams, "textureScale", 0.5, 5).onChange(function (val) {
    ren.geoNeedUpdate = true;
})


var fMaterial = gui.addFolder('Material');
fMaterial.add(params, "material", ['Asphalt08', 'Bark08', 'Bricks37', 'Chip07', 'Metal03', 'PavingStones46', 'Rocks04', 'TEST']).onChange(function (val) {
    ren.updatePBRMaterial(val);
})
fMaterial.add(params, "transparency", 0., 1.).onChange(function (val) {
    ren.material.uniforms.transparency.value = val;
});
fMaterial.add(params, "displaceScale", 0., 0.5).onChange(function (val) {
    ren.material.uniforms.displaceScale.value = val;
});

var fEnv = gui.addFolder('Environment')
fEnv.add(params, "envmap", ['Footballfield', 'Lycksele3', 'Sodermalmsallen', 'TEST']).onChange(function (val) {
    var cube = ren.loadCubeMap(val);
    ren.backgroundscene.background = cube;
    ren.material.uniforms.envMap.value = cube;
});
fEnv.addColor(params, "shadowDir").onChange(function (val) {
    var pos = hsv2pos(val);
    var light = ren.scene.getObjectByName('shadowLight');
    light.position.set(pos.x, pos.z, pos.y);
    light.lookAt(0, 0, 0);

    light = ren.scene.getObjectByName('lightMesh');
    light.position.set(pos.x, pos.z, pos.y);
    light.lookAt(0, 0, 0);

    ren.shadowCamera.position.set(pos.x, pos.z, pos.y);
    ren.shadowCamera.lookAt(0, 0, 0);
});
fEnv.add(params, "camType", ["Perspective", "Orthographic"]).onChange(val => {
    ren.switchCamera();
})
fEnv.add(params, "camAutoRotate").onChange(val => {
    ren.ctrlcamPersp.autoRotate = val;
    ren.ctrlcamOrtho.autoRotate = val;
});
fEnv.add(params, "resetCam");

var fDebug = gui.addFolder('For debug')
fDebug.add(params, "cameraVisible").onChange(function (val) {
    ren.scene.getObjectByName("camHelper").visible = val;
});
fDebug.add(params, "axisVisible").onChange(function (val) {
    ren.scene.getObjectByName("axisHelper").visible = val;
});

params.mode = "Bool Text";
fBoolGeo.open();
fMaterial.open();
fEnv.open();